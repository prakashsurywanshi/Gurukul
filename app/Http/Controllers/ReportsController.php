<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\ComplaintEntry;
use App\Models\EmailLog;
use App\Models\ExamResult;
use App\Models\FeePayment;
use App\Models\FrontOfficeAdmissionEnquiry;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelRoom;
use App\Models\InventoryIssue;
use App\Models\InventoryItem;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\Message;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Models\VisitorRegisterEntry;
use App\Models\VoiceCallLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $selectedClass = $request->string('class')->value() ?: 'all';
        $selectedAcademicYear = $this->resolveSelectedAcademicYear($organization, $request->input('session'));
        abort_unless($selectedAcademicYear, 403, 'Create and activate an academic session first.');
        $selectedMonth = $this->resolveSelectedMonth($selectedAcademicYear, $request->input('month'));
        $activeModule = $request->string('module')->value() ?: 'students';

        return Inertia::render('dashboard/ReportsAnalytics', [
            'user' => $user,
            'classOptions' => $this->getClassOptions($organization),
            'sessionOptions' => $this->sessionOptions($organization),
            'selectedFilters' => [
                'class' => $selectedClass,
                'month' => $selectedMonth,
                'session' => (string) $selectedAcademicYear->id,
                'module' => $activeModule,
            ],
            'attendanceData' => $this->attendanceData($organization, $selectedClass, $selectedAcademicYear),
            'feeCollectionData' => $this->feeCollectionData($organization, $selectedClass, $selectedAcademicYear),
            'studentDistribution' => $this->studentDistribution($organization),
            'examPerformance' => $this->examPerformance($organization, $selectedClass, $selectedAcademicYear),
            'metrics' => $this->metrics($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            'moduleReports' => $this->moduleReports($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            'monthOptions' => $this->monthOptions($selectedAcademicYear),
        ]);
    }

    private function getClassOptions(Organization $organization): Collection
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $class) => [
                'value' => (string) $class->id,
                'label' => 'Class ' . $class->name . ($class->section ? ' - ' . $class->section : ''),
            ])
            ->values();
    }

    private function attendanceData(Organization $organization, string $selectedClass, AcademicYear $selectedAcademicYear): Collection
    {
        $attendance = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('date', [
                $selectedAcademicYear->start_date->toDateString(),
                $selectedAcademicYear->end_date->toDateString(),
            ])
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->get(['date', 'status']);

        return $this->monthSequence($selectedAcademicYear)->map(function (Carbon $monthStart) use ($attendance) {
            $monthEntries = $attendance->filter(
                fn ($entry) => optional($entry->date)?->format('Y-m') === $monthStart->format('Y-m')
            );
            $total = $monthEntries->count();
            $present = $monthEntries->filter(fn ($entry) => in_array($entry->status, ['present', 'late', 'half_day'], true))->count();
            $absent = $monthEntries->filter(fn ($entry) => $entry->status === 'absent')->count();

            return [
                'month' => $monthStart->format('M Y'),
                'present' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                'absent' => $total > 0 ? round(($absent / $total) * 100, 1) : 0,
            ];
        })->values();
    }

    private function feeCollectionData(Organization $organization, string $selectedClass, AcademicYear $selectedAcademicYear): Collection
    {
        $payments = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('payment_date', [
                $selectedAcademicYear->start_date->toDateString(),
                $selectedAcademicYear->end_date->toDateString(),
            ])
            ->whereIn('status', ['completed', 'success'])
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->get(['amount', 'payment_date']);

        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->get(['net_amount', 'balance', 'month', 'year']);

        return $this->monthSequence($selectedAcademicYear)->map(function (Carbon $monthStart) use ($payments, $studentFees) {
            $collected = $payments
                ->filter(fn ($payment) => optional($payment->payment_date)?->format('Y-m') === $monthStart->format('Y-m'))
                ->sum(fn ($payment) => (float) $payment->amount);

            $pending = $studentFees
                ->filter(fn ($fee) => (int) $fee->month === (int) $monthStart->format('n') && (int) $fee->year === (int) $monthStart->format('Y'))
                ->sum(fn ($fee) => (float) ($fee->balance ?? max(0, (float) $fee->net_amount)));

            return [
                'month' => $monthStart->format('M Y'),
                'collected' => round($collected, 2),
                'pending' => round($pending, 2),
            ];
        })->values();
    }

    private function studentDistribution(Organization $organization): Collection
    {
        $students = Student::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->with('schoolClass:id,name')
            ->get();

        $groups = [
            ['label' => 'Class 1-5', 'from' => 1, 'to' => 5, 'color' => '#3b82f6'],
            ['label' => 'Class 6-8', 'from' => 6, 'to' => 8, 'color' => '#8b5cf6'],
            ['label' => 'Class 9-10', 'from' => 9, 'to' => 10, 'color' => '#ec4899'],
            ['label' => 'Class 11-12', 'from' => 11, 'to' => 12, 'color' => '#f59e0b'],
        ];

        return collect($groups)->map(function (array $group) use ($students) {
            $count = $students->filter(function (Student $student) use ($group) {
                $classNumber = (int) preg_replace('/\D+/', '', (string) $student->schoolClass?->name);
                return $classNumber >= $group['from'] && $classNumber <= $group['to'];
            })->count();

            return [
                'class' => $group['label'],
                'students' => $count,
                'color' => $group['color'],
            ];
        })->values();
    }

    private function examPerformance(Organization $organization, string $selectedClass, AcademicYear $selectedAcademicYear): Collection
    {
        return ExamResult::query()
            ->where('organization_id', $organization->id)
            ->whereHas('examSchedule', function ($query) use ($selectedClass, $selectedAcademicYear) {
                $query->whereBetween('exam_date', [
                    $selectedAcademicYear->start_date->toDateString(),
                    $selectedAcademicYear->end_date->toDateString(),
                ])
                    ->when($selectedClass !== 'all', fn ($scheduleQuery) => $scheduleQuery->where('class_id', $selectedClass));
            })
            ->with('examSchedule.subject:id,name')
            ->get()
            ->groupBy(fn ($result) => $result->examSchedule?->subject?->name ?? 'Unknown')
            ->map(fn ($results, $subject) => [
                'subject' => $subject,
                'average' => round($results->avg(fn ($result) => (float) $result->obtained_marks), 1),
            ])
            ->values();
    }

    private function metrics(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $studentsQuery = Student::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass));

        $totalStudents = $studentsQuery->count();

        $attendance = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->get(['status']);

        $attendanceTotal = $attendance->count();
        $attendancePresent = $attendance->filter(fn ($entry) => in_array($entry->status, ['present', 'late', 'half_day'], true))->count();
        $attendanceRate = $attendanceTotal > 0 ? round(($attendancePresent / $attendanceTotal) * 100, 1) : 0;

        $feeCollected = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['completed', 'success'])
            ->whereBetween('payment_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->sum('amount');

        $monthlyFeeDemand = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->where('year', (int) $selectedMonthDate->format('Y'))
            ->where('month', (int) $selectedMonthDate->format('n'))
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->sum('net_amount');

        $booksCount = LibraryBook::query()->where('organization_id', $organization->id)->sum('total_copies');
        $issuedCount = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['Issued', 'Overdue'])
            ->count();

        return [
            'totalStudents' => $totalStudents,
            'attendanceRate' => $attendanceRate,
            'feeCollected' => (float) $feeCollected,
            'feeCollectionRate' => $monthlyFeeDemand > 0 ? round((((float) $feeCollected) / $monthlyFeeDemand) * 100, 1) : 0,
            'libraryBooks' => (int) $booksCount,
            'libraryIssued' => $issuedCount,
        ];
    }

    private function moduleReports(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear): array
    {
        return [
            $this->studentModuleReport($organization, $selectedClass),
            $this->attendanceModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            $this->feesModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            $this->examsModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            $this->libraryModuleReport($organization, $selectedMonth),
            $this->transportModuleReport($organization, $selectedClass),
            $this->hostelModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            $this->inventoryModuleReport($organization),
            $this->frontOfficeModuleReport($organization, $selectedMonth),
            $this->communicationModuleReport($organization, $selectedMonth),
        ];
    }

    private function studentModuleReport(Organization $organization, string $selectedClass): array
    {
        $students = Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->orderByDesc('admission_date')
            ->limit(10)
            ->get();

        $baseQuery = Student::query()
            ->forCurrentSession($organization->id)
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass));

        return [
            'id' => 'students',
            'label' => 'Students',
            'description' => 'Student roster, enrollment status, and contact details.',
            'columns' => ['Admission No', 'Student', 'Class', 'Phone', 'Status', 'Admission Date'],
            'stats' => [
                ['label' => 'Total Students', 'value' => (string) (clone $baseQuery)->count()],
                ['label' => 'Active', 'value' => (string) (clone $baseQuery)->where('status', 'active')->count()],
                ['label' => 'Using Transport', 'value' => (string) (clone $baseQuery)->where('transport_required', true)->count()],
                ['label' => 'Using Hostel', 'value' => (string) (clone $baseQuery)->where('hostel_required', true)->count()],
            ],
            'rows' => $students->map(fn (Student $student) => [
                $student->admission_no ?: '-',
                trim($student->first_name . ' ' . ($student->last_name ?? '')),
                $this->classLabel($student->schoolClass),
                $student->phone ?: '-',
                ucfirst((string) $student->status),
                optional($student->admission_date)->format('d M Y') ?: '-',
            ])->values()->all(),
        ];
    }

    private function attendanceModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->when($selectedClass !== 'all', fn ($builder) => $builder->where('class_id', $selectedClass));

        $entries = (clone $query)
            ->with(['student:id,first_name,last_name', 'schoolClass:id,name,section'])
            ->get();

        $presentStatuses = ['present', 'late', 'half_day'];
        $studentWiseRows = $entries
            ->groupBy(fn (Attendance $entry) => (string) $entry->student_id)
            ->map(function (Collection $studentEntries) use ($presentStatuses) {
                /** @var Attendance $firstEntry */
                $firstEntry = $studentEntries->first();
                $total = $studentEntries->count();
                $present = $studentEntries->whereIn('status', $presentStatuses)->count();
                $absent = $studentEntries->where('status', 'absent')->count();
                $lateHalfDay = $studentEntries->whereIn('status', ['late', 'half_day'])->count();
                $attendanceRate = $total > 0 ? round(($present / $total) * 100, 1) : 0;

                return [
                    'student' => trim(($firstEntry->student?->first_name ?? '') . ' ' . ($firstEntry->student?->last_name ?? '')) ?: '-',
                    'class' => $this->classLabel($firstEntry->schoolClass),
                    'present' => (string) $present,
                    'absent' => (string) $absent,
                    'lateHalfDay' => (string) $lateHalfDay,
                    'attendanceRate' => $attendanceRate . '%',
                ];
            })
            ->sortBy([
                ['class', 'asc'],
                ['student', 'asc'],
            ])
            ->values();

        return [
            'id' => 'attendance',
            'label' => 'Attendance',
            'description' => 'Student-wise monthly attendance summary for the selected class range.',
            'columns' => ['Student', 'Class', 'Present', 'Absent', 'Late / Half Day', 'Attendance Rate'],
            'stats' => [
                ['label' => 'Records', 'value' => (string) (clone $query)->count()],
                ['label' => 'Students', 'value' => (string) $studentWiseRows->count()],
                ['label' => 'Present', 'value' => (string) (clone $query)->whereIn('status', $presentStatuses)->count()],
                ['label' => 'Absent', 'value' => (string) (clone $query)->where('status', 'absent')->count()],
                ['label' => 'Late / Half Day', 'value' => (string) (clone $query)->whereIn('status', ['late', 'half_day'])->count()],
            ],
            'rows' => $studentWiseRows
                ->map(fn (array $row) => [
                    $row['student'],
                    $row['class'],
                    $row['present'],
                    $row['absent'],
                    $row['lateHalfDay'],
                    $row['attendanceRate'],
                ])
                ->all(),
        ];
    }

    private function feesModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->where('year', (int) $selectedMonthDate->format('Y'))
            ->where('month', (int) $selectedMonthDate->format('n'))
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            });

        $rows = (clone $query)
            ->with(['student.schoolClass:id,name,section', 'feeStructure:id,fee_type'])
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        $paymentsQuery = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('payment_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->whereIn('status', ['completed', 'success'])
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            });

        return [
            'id' => 'fees',
            'label' => 'Fees',
            'description' => 'Demand, collections, and pending fee records.',
            'columns' => ['Student', 'Class', 'Fee Type', 'Net Amount', 'Paid', 'Balance', 'Status'],
            'stats' => [
                ['label' => 'Monthly Demand', 'value' => $this->money((float) (clone $query)->sum('net_amount'))],
                ['label' => 'Collected', 'value' => $this->money((float) (clone $paymentsQuery)->sum('amount'))],
                ['label' => 'Pending', 'value' => $this->money((float) (clone $query)->sum('balance'))],
                ['label' => 'Overdue Records', 'value' => (string) (clone $query)->where('balance', '>', 0)->whereDate('due_date', '<', now()->toDateString())->count()],
            ],
            'rows' => $rows->map(fn (StudentFee $fee) => [
                trim(($fee->student?->first_name ?? '') . ' ' . ($fee->student?->last_name ?? '')) ?: '-',
                $this->classLabel($fee->student?->schoolClass),
                $fee->feeStructure?->fee_type ?: 'General Fee',
                $this->money((float) $fee->net_amount),
                $this->money((float) $fee->paid_amount),
                $this->money((float) $fee->balance),
                ucfirst((string) $fee->status),
            ])->values()->all(),
        ];
    }

    private function examsModuleReport(Organization $organization, string $selectedClass, string $selectedMonth): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = ExamResult::query()
            ->where('organization_id', $organization->id)
            ->whereHas('examSchedule', function ($builder) use ($selectedClass, $selectedMonthDate) {
                $builder->whereBetween('exam_date', [
                    $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                    $selectedMonthDate->copy()->endOfMonth()->toDateString(),
                ])
                    ->when($selectedClass !== 'all', fn ($scheduleQuery) => $scheduleQuery->where('class_id', $selectedClass));
            });

        $rows = (clone $query)
            ->with([
                'student.schoolClass:id,name,section',
                'examSchedule.subject:id,name',
                'examSchedule.exam:id,name',
            ])
            ->latest('id')
            ->limit(10)
            ->get();

        return [
            'id' => 'exams',
            'label' => 'Exams',
            'description' => 'Result entries and subject-wise performance snapshots.',
            'columns' => ['Exam', 'Student', 'Class', 'Subject', 'Marks', 'Grade', 'Status'],
            'stats' => [
                ['label' => 'Evaluated Results', 'value' => (string) (clone $query)->count()],
                ['label' => 'Average Marks', 'value' => number_format((float) (clone $query)->avg('obtained_marks'), 1)],
                ['label' => 'Absent', 'value' => (string) (clone $query)->where('is_absent', true)->count()],
                ['label' => 'Distinct Subjects', 'value' => (string) (clone $query)->with('examSchedule')->get()->pluck('examSchedule.subject_id')->filter()->unique()->count()],
            ],
            'rows' => $rows->map(fn (ExamResult $result) => [
                $result->examSchedule?->exam?->name ?: 'Exam',
                trim(($result->student?->first_name ?? '') . ' ' . ($result->student?->last_name ?? '')) ?: '-',
                $this->classLabel($result->student?->schoolClass),
                $result->examSchedule?->subject?->name ?: '-',
                $result->is_absent ? 'Absent' : ($result->obtained_marks . ' / ' . $result->total_marks),
                $result->grade ?: '-',
                $result->is_absent ? 'Absent' : 'Evaluated',
            ])->values()->all(),
        ];
    }

    private function libraryModuleReport(Organization $organization, string $selectedMonth): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('issue_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ]);

        $rows = (clone $query)
            ->with(['book:id,title,category', 'member:id,name,member_type'])
            ->orderByDesc('issue_date')
            ->limit(10)
            ->get();

        return [
            'id' => 'library',
            'label' => 'Library',
            'description' => 'Book issue activity, members, and overdue visibility.',
            'columns' => ['Issue Date', 'Book', 'Category', 'Member', 'Member Type', 'Status'],
            'stats' => [
                ['label' => 'Books in Catalog', 'value' => (string) LibraryBook::query()->where('organization_id', $organization->id)->count()],
                ['label' => 'Issued This Month', 'value' => (string) (clone $query)->count()],
                ['label' => 'Overdue', 'value' => (string) LibraryCirculation::query()->where('organization_id', $organization->id)->where('status', 'Overdue')->count()],
                ['label' => 'Available Copies', 'value' => (string) LibraryBook::query()->where('organization_id', $organization->id)->sum('available_copies')],
            ],
            'rows' => $rows->map(fn (LibraryCirculation $entry) => [
                optional($entry->issue_date)->format('d M Y') ?: '-',
                $entry->book?->title ?: '-',
                $entry->book?->category ?: '-',
                $entry->member?->name ?: '-',
                $entry->member?->member_type ?: '-',
                $entry->status ?: '-',
            ])->values()->all(),
        ];
    }

    private function transportModuleReport(Organization $organization, string $selectedClass): array
    {
        $query = TransportAssignment::query()
            ->whereHas('route', fn ($builder) => $builder->where('organization_id', $organization->id))
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            });

        $rows = (clone $query)
            ->with(['student.schoolClass:id,name,section', 'route:id,route_name', 'vehicle:id,vehicle_number'])
            ->latest('id')
            ->limit(10)
            ->get();

        return [
            'id' => 'transport',
            'label' => 'Transport',
            'description' => 'Transport assignments, routes, and vehicle usage.',
            'columns' => ['Student', 'Class', 'Route', 'Vehicle', 'Pickup', 'Monthly Fee', 'Status'],
            'stats' => [
                ['label' => 'Assigned Students', 'value' => (string) (clone $query)->count()],
                ['label' => 'Active Routes', 'value' => (string) TransportRoute::query()->where('organization_id', $organization->id)->where('status', 'active')->count()],
                ['label' => 'Active Vehicles', 'value' => (string) TransportVehicle::query()->where('organization_id', $organization->id)->where('status', 'active')->count()],
                ['label' => 'Assigned Monthly Fee', 'value' => $this->money((float) (clone $query)->sum('monthly_fee'))],
            ],
            'rows' => $rows->map(fn (TransportAssignment $assignment) => [
                trim(($assignment->student?->first_name ?? '') . ' ' . ($assignment->student?->last_name ?? '')) ?: '-',
                $this->classLabel($assignment->student?->schoolClass),
                $assignment->route?->route_name ?: '-',
                $assignment->vehicle?->vehicle_number ?: '-',
                $assignment->pickup_point ?: '-',
                $this->money((float) $assignment->monthly_fee),
                ucfirst((string) $assignment->status),
            ])->values()->all(),
        ];
    }

    private function hostelModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = HostelAllocation::query()
            ->whereHas('hostel', fn ($builder) => $builder->where('organization_id', $organization->id))
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            });

        $rows = (clone $query)
            ->with(['student.schoolClass:id,name,section', 'hostel:id,name', 'room:id,hostel_id,room_number'])
            ->latest('id')
            ->limit(10)
            ->get();

        $hostelFeeQuery = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->where('year', (int) $selectedMonthDate->format('Y'))
            ->where('month', (int) $selectedMonthDate->format('n'))
            ->whereHas('feeStructure', fn ($builder) => $builder->where('fee_type', 'like', 'Hostel Fee%'))
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            });

        return [
            'id' => 'hostel',
            'label' => 'Hostel',
            'description' => 'Residential allocations and hostel fee visibility.',
            'columns' => ['Student', 'Class', 'Hostel', 'Room', 'Allocated On', 'Departure', 'Status'],
            'stats' => [
                ['label' => 'Residents', 'value' => (string) (clone $query)->where('status', 'active')->count()],
                ['label' => 'Active Hostels', 'value' => (string) Hostel::query()->where('organization_id', $organization->id)->where('status', 'active')->count()],
                ['label' => 'Rooms', 'value' => (string) HostelRoom::query()->whereHas('hostel', fn ($builder) => $builder->where('organization_id', $organization->id))->count()],
                ['label' => 'Hostel Fee Pending', 'value' => $this->money((float) (clone $hostelFeeQuery)->sum('balance'))],
            ],
            'rows' => $rows->map(fn (HostelAllocation $allocation) => [
                trim(($allocation->student?->first_name ?? '') . ' ' . ($allocation->student?->last_name ?? '')) ?: '-',
                $this->classLabel($allocation->student?->schoolClass),
                $allocation->hostel?->name ?: '-',
                $allocation->room?->room_number ?: '-',
                optional($allocation->allocation_date)->format('d M Y') ?: '-',
                optional($allocation->departure_date)->format('d M Y') ?: '-',
                ucfirst((string) $allocation->status),
            ])->values()->all(),
        ];
    }

    private function inventoryModuleReport(Organization $organization): array
    {
        $query = InventoryItem::query()->where('organization_id', $organization->id);

        $rows = (clone $query)
            ->with(['category:id,name', 'store:id,name', 'supplier:id,name'])
            ->orderBy('name')
            ->limit(10)
            ->get();

        return [
            'id' => 'inventory',
            'label' => 'Inventory',
            'description' => 'Item availability, stock positions, and low-stock alerts.',
            'columns' => ['Item', 'Category', 'Store', 'Supplier', 'Available', 'Minimum', 'Stock Status'],
            'stats' => [
                ['label' => 'Items', 'value' => (string) (clone $query)->count()],
                ['label' => 'Low Stock', 'value' => (string) (clone $query)->whereColumn('available_stock', '<=', 'minimum_stock')->count()],
                ['label' => 'Stores', 'value' => (string) InventoryStore::query()->where('organization_id', $organization->id)->count()],
                ['label' => 'Open Issues', 'value' => (string) InventoryIssue::query()->where('organization_id', $organization->id)->where('status', 'Issued')->count()],
            ],
            'rows' => $rows->map(fn (InventoryItem $item) => [
                $item->name,
                $item->category?->name ?: '-',
                $item->store?->name ?: '-',
                $item->supplier?->name ?: '-',
                (string) $item->available_stock,
                (string) $item->minimum_stock,
                $item->available_stock <= $item->minimum_stock ? 'Low Stock' : 'Healthy',
            ])->values()->all(),
        ];
    }

    private function frontOfficeModuleReport(Organization $organization, string $selectedMonth): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $enquiries = FrontOfficeAdmissionEnquiry::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('enquiry_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->latest('enquiry_date')
            ->limit(4)
            ->get()
            ->map(fn (FrontOfficeAdmissionEnquiry $entry) => [
                optional($entry->enquiry_date)->format('d M Y') ?: '-',
                'Admission Enquiry',
                $entry->full_name,
                $entry->phone ?: '-',
                $entry->source ?: '-',
                ucfirst((string) $entry->status),
            ]);

        $visitors = VisitorRegisterEntry::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('entry_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->latest('entry_date')
            ->limit(3)
            ->get()
            ->map(fn (VisitorRegisterEntry $entry) => [
                optional($entry->entry_date)->format('d M Y') ?: '-',
                'Visitor',
                $entry->visitor_name,
                $entry->contact ?: '-',
                $entry->purpose ?: '-',
                $entry->exit_time ? 'Closed' : 'Open',
            ]);

        $complaints = ComplaintEntry::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('complaint_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->latest('complaint_date')
            ->limit(3)
            ->get()
            ->map(fn (ComplaintEntry $entry) => [
                optional($entry->complaint_date)->format('d M Y') ?: '-',
                'Complaint',
                $entry->complainant_name,
                $entry->phone ?: '-',
                $entry->category ?: '-',
                ucfirst((string) $entry->status),
            ]);

        return [
            'id' => 'front-office',
            'label' => 'Front Office',
            'description' => 'Recent enquiries, visitors, and complaint desk activity.',
            'columns' => ['Date', 'Type', 'Name', 'Contact', 'Purpose / Category', 'Status'],
            'stats' => [
                ['label' => 'Enquiries', 'value' => (string) FrontOfficeAdmissionEnquiry::query()->where('organization_id', $organization->id)->whereBetween('enquiry_date', [$selectedMonthDate->copy()->startOfMonth()->toDateString(), $selectedMonthDate->copy()->endOfMonth()->toDateString()])->count()],
                ['label' => 'Visitors', 'value' => (string) VisitorRegisterEntry::query()->where('organization_id', $organization->id)->whereBetween('entry_date', [$selectedMonthDate->copy()->startOfMonth()->toDateString(), $selectedMonthDate->copy()->endOfMonth()->toDateString()])->count()],
                ['label' => 'Complaints', 'value' => (string) ComplaintEntry::query()->where('organization_id', $organization->id)->whereBetween('complaint_date', [$selectedMonthDate->copy()->startOfMonth()->toDateString(), $selectedMonthDate->copy()->endOfMonth()->toDateString()])->count()],
                ['label' => 'Open Complaints', 'value' => (string) ComplaintEntry::query()->where('organization_id', $organization->id)->where('status', '!=', 'resolved')->count()],
            ],
            'rows' => $enquiries->concat($visitors)->concat($complaints)->take(10)->values()->all(),
        ];
    }

    private function communicationModuleReport(Organization $organization, string $selectedMonth): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $messages = Message::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->with('sender:id,name')
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Message $entry) => [
                optional($entry->created_at)->format('d M Y') ?: '-',
                'Message',
                $entry->subject ?: 'Announcement',
                $entry->sender?->name ?: '-',
                $entry->priority ?: '-',
                $entry->is_announcement ? 'Announcement' : 'Sent',
            ]);

        $emails = EmailLog::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->with('sender:id,name')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn (EmailLog $entry) => [
                optional($entry->sent_at ?? $entry->created_at)->format('d M Y') ?: '-',
                'Email',
                $entry->subject ?: '-',
                $entry->sender?->name ?: '-',
                $entry->audience_type ?: '-',
                ucfirst((string) $entry->status),
            ]);

        $voiceCalls = VoiceCallLog::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->with('sender:id,name')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn (VoiceCallLog $entry) => [
                optional($entry->sent_at ?? $entry->scheduled_for ?? $entry->created_at)->format('d M Y') ?: '-',
                'Voice Call',
                $entry->subject ?: '-',
                $entry->sender?->name ?: '-',
                $entry->audience_type ?: '-',
                ucfirst((string) $entry->status),
            ]);

        return [
            'id' => 'communication',
            'label' => 'Communication',
            'description' => 'Messages, email campaigns, and voice call activity.',
            'columns' => ['Date', 'Channel', 'Subject', 'Sent By', 'Audience', 'Status'],
            'stats' => [
                ['label' => 'Messages', 'value' => (string) Message::query()->where('organization_id', $organization->id)->whereBetween('created_at', [$selectedMonthDate->copy()->startOfMonth()->toDateString(), $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString()])->count()],
                ['label' => 'Emails', 'value' => (string) EmailLog::query()->where('organization_id', $organization->id)->whereBetween('created_at', [$selectedMonthDate->copy()->startOfMonth()->toDateString(), $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString()])->count()],
                ['label' => 'Voice Calls', 'value' => (string) VoiceCallLog::query()->where('organization_id', $organization->id)->whereBetween('created_at', [$selectedMonthDate->copy()->startOfMonth()->toDateString(), $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString()])->count()],
                ['label' => 'Announcements', 'value' => (string) Message::query()->where('organization_id', $organization->id)->where('is_announcement', true)->count()],
            ],
            'rows' => $messages->concat($emails)->concat($voiceCalls)->take(10)->values()->all(),
        ];
    }

    private function sessionOptions(Organization $organization): Collection
    {
        return AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'is_current'])
            ->map(fn (AcademicYear $session) => [
                'value' => (string) $session->id,
                'label' => $session->name,
                'isCurrent' => $session->is_current,
            ])
            ->values();
    }

    private function monthOptions(AcademicYear $selectedAcademicYear): Collection
    {
        return $this->monthSequence($selectedAcademicYear)
            ->map(fn (Carbon $month) => [
                'value' => $month->format('Y-m'),
                'label' => $month->format('M Y'),
            ])
            ->values();
    }

    private function monthSequence(AcademicYear $selectedAcademicYear): Collection
    {
        $months = collect();
        $cursor = $selectedAcademicYear->start_date->copy()->startOfMonth();
        $end = $selectedAcademicYear->end_date->copy()->startOfMonth();

        while ($cursor->lte($end)) {
            $months->push($cursor->copy());
            $cursor->addMonth();
        }

        return $months;
    }

    private function resolveSelectedAcademicYear(Organization $organization, mixed $selectedSession): ?AcademicYear
    {
        $query = AcademicYear::query()->where('organization_id', $organization->id);

        if ($selectedSession) {
            $session = (clone $query)->find($selectedSession);
            if ($session) {
                return $session;
            }
        }

        return (clone $query)->where('is_current', true)->first()
            ?? (clone $query)->orderByDesc('start_date')->first();
    }

    private function resolveSelectedMonth(AcademicYear $selectedAcademicYear, mixed $selectedMonth): string
    {
        $validMonths = $this->monthOptions($selectedAcademicYear)->pluck('value');

        if ($selectedMonth && $validMonths->contains((string) $selectedMonth)) {
            return (string) $selectedMonth;
        }

        $currentMonth = now()->format('Y-m');

        return $validMonths->contains($currentMonth)
            ? $currentMonth
            : (string) $validMonths->first();
    }

    private function classLabel(?SchoolClass $class): string
    {
        if (!$class) {
            return '-';
        }

        return 'Class ' . $class->name . ($class->section ? ' - ' . $class->section : '');
    }

    private function money(float $amount): string
    {
        return 'Rs ' . number_format($amount, 0);
    }

    private function getActiveAcademicYearId(Organization $organization): ?int
    {
        return $organization->selectedAcademicYear()?->id;
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (!$user) {
            return null;
        }

        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
