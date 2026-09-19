<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\ActivityLog;
use App\Models\AlumniRecord;
use App\Models\Attendance;
use App\Models\AuditTrail;
use App\Models\ComplaintEntry;
use App\Models\Department;
use App\Models\Designation;
use App\Models\EmailLog;
use App\Models\ExamResult;
use App\Models\FeePayment;
use App\Models\FrontOfficeAdmissionEnquiry;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelRoom;
use App\Models\InventoryIssue;
use App\Models\InventoryItem;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use App\Models\LeaveRequest;
use App\Models\LessonPlan;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\Message;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\SavedReport;
use App\Models\Semester;
use App\Models\StaffAttendance;
use App\Models\StaffPayrollEntry;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\Subject;
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
use Illuminate\Support\Facades\Response;
use App\Services\PdfService;
use App\Services\XlsxExportService;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ReportsController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $this->applySavedReport($request, $organization);

        $selectedClass = $request->string('class')->value() ?: 'all';
        $selectedAcademicYear = $this->resolveSelectedAcademicYear($organization, $request->input('session'));
        abort_unless($selectedAcademicYear, 403, 'Create and activate an academic session first.');

        $activeModule = $request->string('module')->value() ?: 'students';
        $page = max(1, (int) $request->input('page', 1));
        $search = $request->string('search')->value() ?: '';
        $dateFrom = $request->input('date_from') ?: null;
        $dateTo = $request->input('date_to') ?: null;

        $selectedSemester = $this->resolveSelectedSemester($organization, $selectedAcademicYear, $request->input('semester'));
        $periodStart = $selectedSemester ? $selectedSemester->start_date : $selectedAcademicYear->start_date;
        $periodEnd = $selectedSemester ? $selectedSemester->end_date : $selectedAcademicYear->end_date;
        $selectedMonth = $this->resolveSelectedMonth($periodStart, $periodEnd, $request->input('month'));

        return Inertia::render('dashboard/ReportsAnalytics', [
            'user' => $user,
            'classOptions' => $this->getClassOptions($organization),
            'sessionOptions' => $this->sessionOptions($organization),
            'semesterOptions' => $this->semesterOptions($selectedAcademicYear),
            'selectedFilters' => [
                'class' => $selectedClass,
                'month' => $selectedMonth,
                'session' => (string) $selectedAcademicYear->id,
                'module' => $activeModule,
                'search' => $search,
                'semester' => (string) ($selectedSemester?->id ?? 'all'),
            ],
            'attendanceData' => $this->attendanceData($organization, $selectedClass, $selectedAcademicYear, $selectedSemester),
            'feeCollectionData' => $this->feeCollectionData($organization, $selectedClass, $selectedAcademicYear, $selectedSemester),
            'studentDistribution' => $this->studentDistribution($organization),
            'examPerformance' => $this->examPerformance($organization, $selectedClass, $selectedAcademicYear, $selectedSemester),
            'metrics' => $this->metrics($organization, $selectedClass, $selectedMonth, $selectedAcademicYear),
            'moduleReports' => $this->moduleReports($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $page, $search, $dateFrom, $dateTo, $selectedSemester),
            'monthOptions' => $this->monthOptionsFor($periodStart, $periodEnd),
        ]);
    }

    public function exportPdf(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $this->applySavedReport($request, $organization);

        $selectedClass = $request->string('class')->value() ?: 'all';
        $selectedAcademicYear = $this->resolveSelectedAcademicYear($organization, $request->input('session'));
        abort_unless($selectedAcademicYear, 403, 'Create and activate an academic session first.');

        $selectedMonth = $this->resolveSelectedMonth($selectedAcademicYear->start_date, $selectedAcademicYear->end_date, $request->input('month'));
        $module = $request->string('module')->value() ?: 'students';
        $search = $request->string('search')->value() ?: '';

        $selectedSemester = $this->resolveSelectedSemester($organization, $selectedAcademicYear, $request->input('semester'));

        $reports = $this->moduleReports($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, 1, $search, null, null, $selectedSemester);
        $report = collect($reports)->firstWhere('id', $module) ?? $reports[0];

        $html = view('reports.pdf-export', [
            'report' => $report,
            'organization' => $organization,
            'generatedAt' => now()->format('d M Y, h:i A'),
        ])->render();

        return app(PdfService::class)->download(
            $html,
            "{$report['label']}-Report-" . now()->format('Y-m-d') . '.pdf',
            ['orientation' => 'landscape']
        );
    }

    public function exportCsv(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $this->applySavedReport($request, $organization);

        $selectedClass = $request->string('class')->value() ?: 'all';
        $selectedAcademicYear = $this->resolveSelectedAcademicYear($organization, $request->input('session'));
        abort_unless($selectedAcademicYear, 403, 'Create and activate an academic session first.');

        $selectedMonth = $this->resolveSelectedMonth($selectedAcademicYear->start_date, $selectedAcademicYear->end_date, $request->input('month'));
        $module = $request->string('module')->value() ?: 'students';
        $search = $request->string('search')->value() ?: '';

        $selectedSemester = $this->resolveSelectedSemester($organization, $selectedAcademicYear, $request->input('semester'));

        $reports = $this->moduleReports($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $request->integer('page', 1), $search, null, null, $selectedSemester);
        $report = collect($reports)->firstWhere('id', $module) ?? $reports[0];

        $filename = str_replace(' ', '-', $report['label']) . '-Report-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($report) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, $report['columns']);

            foreach ($report['rows'] as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportXlsx(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $this->applySavedReport($request, $organization);

        $selectedClass = $request->string('class')->value() ?: 'all';
        $selectedAcademicYear = $this->resolveSelectedAcademicYear($organization, $request->input('session'));
        abort_unless($selectedAcademicYear, 403, 'Create and activate an academic session first.');

        $selectedMonth = $this->resolveSelectedMonth($selectedAcademicYear->start_date, $selectedAcademicYear->end_date, $request->input('month'));
        $module = $request->string('module')->value() ?: 'students';
        $search = $request->string('search')->value() ?: '';

        $selectedSemester = $this->resolveSelectedSemester($organization, $selectedAcademicYear, $request->input('semester'));

        $reports = $this->moduleReports($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $request->integer('page', 1), $search, null, null, $selectedSemester);
        $report = collect($reports)->firstWhere('id', $module) ?? $reports[0];

        $filename = str_replace(' ', '-', $report['label']) . '-Report-' . now()->format('Y-m-d') . '.xlsx';
        $binary = app(XlsxExportService::class)->build($report['columns'], $report['rows']);

        return app(XlsxExportService::class)->download($binary, $filename);
    }

    private function applySavedReport(Request $request, Organization $organization): void
    {
        $savedReportId = $request->input('saved_report_id');

        if (!$savedReportId) {
            return;
        }

        $savedReport = SavedReport::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->find($savedReportId);

        abort_unless($savedReport, 403);

        $request->merge([
            'module' => $savedReport->module,
            ...array_intersect_key($savedReport->filters, array_flip(['class', 'session', 'month', 'search', 'date_from', 'date_to', 'semester'])),
        ]);
    }

    private function getClassOptions(Organization $organization): Collection
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);
    }

    private function attendanceData(Organization $organization, string $selectedClass, AcademicYear $selectedAcademicYear, ?Semester $semester = null): Collection
    {
        $periodStart = $semester ? $semester->start_date->copy()->startOfMonth() : $selectedAcademicYear->start_date->copy()->startOfMonth();
        $periodEnd = $semester ? $semester->end_date->copy()->startOfMonth() : $selectedAcademicYear->end_date->copy()->startOfMonth();

        $attendance = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('date', [
                $periodStart->toDateString(),
                $periodEnd->copy()->endOfMonth()->toDateString(),
            ])
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->get(['date', 'status']);

        return $this->monthSequenceBetween($periodStart, $periodEnd)->map(function (Carbon $monthStart) use ($attendance) {
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

    private function feeCollectionData(Organization $organization, string $selectedClass, AcademicYear $selectedAcademicYear, ?Semester $semester = null): Collection
    {
        $periodStart = $semester ? $semester->start_date->copy()->startOfMonth() : $selectedAcademicYear->start_date->copy()->startOfMonth();
        $periodEnd = $semester ? $semester->end_date->copy()->startOfMonth() : $selectedAcademicYear->end_date->copy()->startOfMonth();

        $payments = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('payment_date', [
                $periodStart->toDateString(),
                $periodEnd->copy()->endOfMonth()->toDateString(),
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

        return $this->monthSequenceBetween($periodStart, $periodEnd)->map(function (Carbon $monthStart) use ($payments, $studentFees) {
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

        if (app(\App\Services\OrgTypePolicy::class)->isCollegeMode($organization)) {
            $palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#2563EB', '#06b6d4', '#eab308'];

            return $students
                ->groupBy(fn (Student $student) => $student->schoolClass?->name ?: 'Unassigned')
                ->map(fn (Collection $courseStudents, string $courseName) => [
                    'class' => $courseName,
                    'students' => $courseStudents->count(),
                    'color' => '#3b82f6',
                ])
                ->sortByDesc('students')
                ->take(6)
                ->values()
                ->map(function (array $entry, int $index) use ($palette) {
                    $entry['color'] = $palette[$index % count($palette)];

                    return $entry;
                });
        }

        $groups = [
            ['label' => 'Class 1-5', 'from' => 1, 'to' => 5, 'color' => '#3b82f6'],
            ['label' => 'Class 6-8', 'from' => 6, 'to' => 8, 'color' => '#8b5cf6'],
            ['label' => 'Class 9-10', 'from' => 9, 'to' => 10, 'color' => '#ec4899'],
            ['label' => 'Class 11-12', 'from' => 11, 'to' => 12, 'color' => '#2563EB'],
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

    private function examPerformance(Organization $organization, string $selectedClass, AcademicYear $selectedAcademicYear, ?Semester $semester = null): Collection
    {
        $periodStart = $semester ? $semester->start_date : $selectedAcademicYear->start_date;
        $periodEnd = $semester ? $semester->end_date : $selectedAcademicYear->end_date;

        return ExamResult::query()
            ->where('organization_id', $organization->id)
            ->whereHas('examSchedule', function ($query) use ($selectedClass, $periodStart, $periodEnd) {
                $query->whereBetween('exam_date', [
                    $periodStart->toDateString(),
                    $periodEnd->toDateString(),
                ])
                    ->when($selectedClass !== 'all', fn ($scheduleQuery) => $scheduleQuery->where('class_id', $selectedClass));
            })
            ->with('examSchedule.subject:id,name,name_mr,name_hi')
            ->get()
            ->groupBy(fn ($result) => $result->examSchedule?->subject?->localized('name') ?? 'Unknown')
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

    private function moduleReports(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear, int $page = 1, string $search = '', ?string $dateFrom = null, ?string $dateTo = null, ?Semester $semester = null): array
    {
        $reports = [
            $this->studentModuleReport($organization, $selectedClass, $page, $search),
            $this->attendanceModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $page, $search, $semester),
            $this->feesModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $page, $search, $semester),
            $this->examsModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $page, $search, $semester),
            $this->libraryModuleReport($organization, $selectedMonth, $page, $search),
            $this->transportModuleReport($organization, $selectedClass, $page, $search),
            $this->hostelModuleReport($organization, $selectedClass, $selectedMonth, $selectedAcademicYear, $page, $search),
            $this->inventoryModuleReport($organization, $page, $search),
            $this->frontOfficeModuleReport($organization, $selectedMonth, $page, $search),
            $this->communicationModuleReport($organization, $selectedMonth, $page, $search),
            $this->lessonPlanModuleReport($organization, $selectedClass, $selectedMonth, $page, $search),
            $this->humanResourceModuleReport($organization, $selectedMonth, $page, $search),
            $this->homeworkModuleReport($organization, $selectedClass, $selectedMonth, $page, $search),
            $this->alumniModuleReport($organization, $page, $search),
            $this->activityLogModuleReport($organization, $selectedMonth, $page, $search),
            $this->auditTrailModuleReport($organization, $selectedMonth, $page, $search),
        ];

        return $this->applyReportTerminology($organization, $reports);
    }

    private function reportLabels(Organization $organization): array
    {
        if (! app(\App\Services\OrgTypePolicy::class)->isCollegeMode($organization)) {
            return [];
        }

        return [
            'Class' => 'Course',
            'Exam' => 'Term Exam',
        ];
    }

    private function applyReportTerminology(Organization $organization, array $reports): array
    {
        $labels = $this->reportLabels($organization);

        if ($labels === []) {
            return $reports;
        }

        return collect($reports)->map(function (array $report) use ($labels) {
            $report['columns'] = array_map(
                fn (string $column) => $labels[$column] ?? $column,
                $report['columns']
            );
            $report['stats'] = array_map(
                fn (array $stat) => [
                    'label' => $labels[$stat['label']] ?? $stat['label'],
                    'value' => $stat['value'],
                ],
                $report['stats']
            );

            return $report;
        })->values()->all();
    }

    private function studentModuleReport(Organization $organization, string $selectedClass, int $page = 1, string $search = ''): array
    {
        $paginator = Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->when($search !== '', fn ($q) => $q->where(function ($sq) use ($search) { $sq->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")->orWhere('admission_no', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"); }))
            ->orderByDesc('admission_date')
            ->paginate(15, ['*'], 'page', $page);

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
            'rows' => collect($paginator->items())->map(fn (Student $student) => [
                $student->admission_no ?: '-',
                trim($student->first_name . ' ' . ($student->last_name ?? '')),
                $this->classLabel($student->schoolClass),
                $student->phone ?: '-',
                ucfirst((string) $student->status),
                optional($student->admission_date)->format('d M Y') ?: '-',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function attendanceModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear, int $page = 1, string $search = '', ?Semester $semester = null): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $periodStart = $semester ? $semester->start_date : $selectedMonthDate->copy()->startOfMonth();
        $periodEnd = $semester ? $semester->end_date : $selectedMonthDate->copy()->endOfMonth();

        $query = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('date', [
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
            ])
            ->when($selectedClass !== 'all', fn ($builder) => $builder->where('class_id', $selectedClass));

        $entries = (clone $query)
            ->with(['student:id,first_name,last_name', 'schoolClass:id,name,section'])
            ->get();

        $entries = $entries->filter(fn ($entry) => !$search || str_contains(strtolower(trim(($entry->student?->first_name ?? '') . ' ' . ($entry->student?->last_name ?? ''))), strtolower($search)));

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
                    trim(($firstEntry->student?->first_name ?? '') . ' ' . ($firstEntry->student?->last_name ?? '')) ?: '-',
                    $this->classLabel($firstEntry->schoolClass),
                    (string) $present,
                    (string) $absent,
                    (string) $lateHalfDay,
                    $attendanceRate . '%',
                ];
            })
            ->sortBy([
                [0, 'asc'],
                [1, 'asc'],
            ])
            ->values();

        $paginator = new \Illuminate\Pagination\LengthAwarePaginator($studentWiseRows->forPage($page, 15), $studentWiseRows->count(), 15, $page);

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
            'rows' => $paginator->items(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function feesModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear, int $page = 1, string $search = '', ?Semester $semester = null): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $periodStart = $semester ? $semester->start_date : $selectedMonthDate->copy()->startOfMonth();
        $periodEnd = $semester ? $semester->end_date : $selectedMonthDate->copy()->endOfMonth();

        $query = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->when(!$semester, fn ($builder) => $builder->where('year', (int) $selectedMonthDate->format('Y'))->where('month', (int) $selectedMonthDate->format('n')))
            ->whereBetween('due_date', [
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
            ])
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->when($search !== '', fn ($q) => $q->whereHas('student', fn ($sq) => $sq->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")));

        $paginator = (clone $query)
            ->with(['student.schoolClass:id,name,section', 'feeStructure:id,fee_type,fee_type_mr,fee_type_hi'])
            ->orderBy('due_date')
            ->paginate(15, ['*'], 'page', $page);

        $paymentsQuery = FeePayment::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('payment_date', [
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
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
            'rows' => collect($paginator->items())->map(fn (StudentFee $fee) => [
                trim(($fee->student?->first_name ?? '') . ' ' . ($fee->student?->last_name ?? '')) ?: '-',
                $this->classLabel($fee->student?->schoolClass),
                ($fee->feeStructure?->localized('fee_type') ?: 'General Fee'),
                $this->money((float) $fee->net_amount),
                $this->money((float) $fee->paid_amount),
                $this->money((float) $fee->balance),
                ucfirst((string) $fee->status),
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function examsModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear, int $page = 1, string $search = '', ?Semester $semester = null): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $periodStart = $semester ? $semester->start_date : $selectedMonthDate->copy()->startOfMonth();
        $periodEnd = $semester ? $semester->end_date : $selectedMonthDate->copy()->endOfMonth();

        $query = ExamResult::query()
            ->where('organization_id', $organization->id)
            ->whereHas('examSchedule', function ($builder) use ($selectedClass, $periodStart, $periodEnd) {
                $builder->whereBetween('exam_date', [
                    $periodStart->toDateString(),
                    $periodEnd->toDateString(),
                ])
                    ->when($selectedClass !== 'all', fn ($scheduleQuery) => $scheduleQuery->where('class_id', $selectedClass));
            })
            ->when($search !== '', fn ($q) => $q->whereHas('student', fn ($sq) => $sq->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")));

        $paginator = (clone $query)
            ->with([
                'student.schoolClass:id,name,section',
                'examSchedule.subject:id,name,name_mr,name_hi',
                'examSchedule.exam:id,name,name_mr,name_hi',
            ])
            ->latest('id')
            ->paginate(15, ['*'], 'page', $page);

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
            'rows' => collect($paginator->items())->map(fn (ExamResult $result) => [
                $result->examSchedule?->exam?->name ?: 'Exam',
                trim(($result->student?->first_name ?? '') . ' ' . ($result->student?->last_name ?? '')) ?: '-',
                $this->classLabel($result->student?->schoolClass),
                $result->examSchedule?->subject?->localized('name') ?: '-',
                $result->is_absent ? 'Absent' : ($result->obtained_marks . ' / ' . $result->total_marks),
                $result->grade ?: '-',
                $result->is_absent ? 'Absent' : 'Evaluated',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function libraryModuleReport(Organization $organization, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('issue_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->when($search !== '', fn ($q) => $q->where('book_title', 'like', "%{$search}%"));

        $paginator = (clone $query)
            ->with(['book:id,title,category', 'member:id,name,member_type'])
            ->orderByDesc('issue_date')
            ->paginate(15, ['*'], 'page', $page);

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
            'rows' => collect($paginator->items())->map(fn (LibraryCirculation $entry) => [
                optional($entry->issue_date)->format('d M Y') ?: '-',
                $entry->book?->title ?: '-',
                $entry->book?->category ?: '-',
                $entry->member?->name ?: '-',
                $entry->member?->member_type ?: '-',
                $entry->status ?: '-',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function transportModuleReport(Organization $organization, string $selectedClass, int $page = 1, string $search = ''): array
    {
        $query = TransportAssignment::query()
            ->whereHas('route', fn ($builder) => $builder->where('organization_id', $organization->id))
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->when($search !== '', fn ($q) => $q->whereHas('student', fn ($sq) => $sq->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")));

        $paginator = (clone $query)
            ->with(['student.schoolClass:id,name,section', 'route:id,route_name', 'vehicle:id,vehicle_number'])
            ->latest('id')
            ->paginate(15, ['*'], 'page', $page);

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
            'rows' => collect($paginator->items())->map(fn (TransportAssignment $assignment) => [
                trim(($assignment->student?->first_name ?? '') . ' ' . ($assignment->student?->last_name ?? '')) ?: '-',
                $this->classLabel($assignment->student?->schoolClass),
                $assignment->route?->route_name ?: '-',
                $assignment->vehicle?->vehicle_number ?: '-',
                $assignment->pickup_point ?: '-',
                $this->money((float) $assignment->monthly_fee),
                ucfirst((string) $assignment->status),
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function hostelModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, AcademicYear $selectedAcademicYear, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $query = HostelAllocation::query()
            ->whereHas('hostel', fn ($builder) => $builder->where('organization_id', $organization->id))
            ->when($selectedClass !== 'all', function ($builder) use ($selectedClass) {
                $builder->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->when($search !== '', fn ($q) => $q->whereHas('student', fn ($sq) => $sq->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")));

        $paginator = (clone $query)
            ->with(['student.schoolClass:id,name,section', 'hostel:id,name', 'room:id,hostel_id,room_number'])
            ->latest('id')
            ->paginate(15, ['*'], 'page', $page);

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
            'rows' => collect($paginator->items())->map(fn (HostelAllocation $allocation) => [
                trim(($allocation->student?->first_name ?? '') . ' ' . ($allocation->student?->last_name ?? '')) ?: '-',
                $this->classLabel($allocation->student?->schoolClass),
                $allocation->hostel?->name ?: '-',
                $allocation->room?->room_number ?: '-',
                optional($allocation->allocation_date)->format('d M Y') ?: '-',
                optional($allocation->departure_date)->format('d M Y') ?: '-',
                ucfirst((string) $allocation->status),
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function inventoryModuleReport(Organization $organization, int $page = 1, string $search = ''): array
    {
        $query = InventoryItem::query()->where('organization_id', $organization->id)
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('category', 'like', "%{$search}%"));

        $paginator = (clone $query)
            ->with(['category:id,name', 'store:id,name', 'supplier:id,name'])
            ->orderBy('name')
            ->paginate(15, ['*'], 'page', $page);

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
            'rows' => collect($paginator->items())->map(fn (InventoryItem $item) => [
                $item->name,
                $item->category?->name ?: '-',
                $item->store?->name ?: '-',
                $item->supplier?->name ?: '-',
                (string) $item->available_stock,
                (string) $item->minimum_stock,
                $item->available_stock <= $item->minimum_stock ? 'Low Stock' : 'Healthy',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function frontOfficeModuleReport(Organization $organization, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $enquiries = FrontOfficeAdmissionEnquiry::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('enquiry_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
            ->latest('enquiry_date')
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
            ->when($search !== '', fn ($q) => $q->where('visitor_name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
            ->latest('entry_date')
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
            ->when($search !== '', fn ($q) => $q->where('complainant_name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"))
            ->latest('complaint_date')
            ->get()
            ->map(fn (ComplaintEntry $entry) => [
                optional($entry->complaint_date)->format('d M Y') ?: '-',
                'Complaint',
                $entry->complainant_name,
                $entry->phone ?: '-',
                $entry->category ?: '-',
                ucfirst((string) $entry->status),
            ]);

        $allRows = $enquiries->concat($visitors)->concat($complaints);
        $paginator = new \Illuminate\Pagination\LengthAwarePaginator($allRows->forPage($page, 15), $allRows->count(), 15, $page);

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
            'rows' => $paginator->items(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function communicationModuleReport(Organization $organization, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $messages = Message::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->when($search !== '', fn ($q) => $q->where('subject', 'like', "%{$search}%"))
            ->with('sender:id,name')
            ->latest()
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
            ->when($search !== '', fn ($q) => $q->where('subject', 'like', "%{$search}%"))
            ->with('sender:id,name')
            ->latest()
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
            ->when($search !== '', fn ($q) => $q->where('subject', 'like', "%{$search}%"))
            ->with('sender:id,name')
            ->latest()
            ->get()
            ->map(fn (VoiceCallLog $entry) => [
                optional($entry->sent_at ?? $entry->scheduled_for ?? $entry->created_at)->format('d M Y') ?: '-',
                'Voice Call',
                $entry->subject ?: '-',
                $entry->sender?->name ?: '-',
                $entry->audience_type ?: '-',
                ucfirst((string) $entry->status),
            ]);

        $allRows = $messages->concat($emails)->concat($voiceCalls);
        $paginator = new \Illuminate\Pagination\LengthAwarePaginator($allRows->forPage($page, 15), $allRows->count(), 15, $page);

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
            'rows' => $paginator->items(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function lessonPlanModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();

        $query = LessonPlan::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('lesson_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->with(['schoolClass:id,name,section', 'subject:id,name,name_mr,name_hi', 'teacher:id,name'])
            ->when($selectedClass !== 'all', fn ($q) => $q->where('class_id', $selectedClass))
            ->when($search !== '', fn ($q) => $q->where('lesson_title', 'like', "%{$search}%")->orWhere('topic', 'like', "%{$search}%"))
            ->latest('lesson_date');

        $paginator = (clone $query)
            ->paginate(15, ['*'], 'page', $page);

        $baseQuery = LessonPlan::query()
            ->where('organization_id', $organization->id)
            ->when($selectedClass !== 'all', fn ($q) => $q->where('class_id', $selectedClass));

        $totalPlans = (clone $baseQuery)->count();
        $completed = (clone $baseQuery)->where('status', 'completed')->count();
        $inProgress = (clone $baseQuery)->where('status', 'in_progress')->count();
        $planned = (clone $baseQuery)->where('status', 'planned')->count();

        return [
            'id' => 'lesson-plan',
            'label' => 'Lesson Plan',
            'description' => 'Lesson plans, topics covered, and teaching schedule.',
            'columns' => ['Date', 'Class', 'Subject', 'Teacher', 'Title', 'Status'],
            'stats' => [
                ['label' => 'Total Plans', 'value' => (string) $totalPlans],
                ['label' => 'Completed', 'value' => (string) $completed],
                ['label' => 'In Progress', 'value' => (string) $inProgress],
                ['label' => 'Planned', 'value' => (string) $planned],
            ],
            'rows' => collect($paginator->items())->map(fn (LessonPlan $plan) => [
                optional($plan->lesson_date)->format('d M Y') ?: '-',
                $this->classLabel($plan->schoolClass),
                $plan->subject?->localized('name') ?: '-',
                $plan->teacher?->name ?: '-',
                $plan->lesson_title ?: '-',
                ucfirst(str_replace('_', ' ', (string) $plan->status)),
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function humanResourceModuleReport(Organization $organization, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();

        $staffPaginator = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['teacher', 'accountant', 'librarian', 'transport_manager', 'hostel_warden'])
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('employee_id', 'like', "%{$search}%"))
            ->with(['designation:id,name', 'department:id,name'])
            ->paginate(15, ['*'], 'page', $page);

        $totalStaff = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['teacher', 'accountant', 'librarian', 'transport_manager', 'hostel_warden'])
            ->count();

        $presentToday = StaffAttendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', $selectedMonthDate->copy()->toDateString())
            ->whereIn('status', ['present', 'late', 'half_day'])
            ->count();

        $pendingPayroll = StaffPayrollEntry::query()
            ->where('organization_id', $organization->id)
            ->where('payroll_month', $selectedMonthDate->copy()->toDateString())
            ->where('status', '!=', 'paid')
            ->count();

        $onLeave = LeaveRequest::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', null)
            ->where('status', 'approved')
            ->where('from_date', '<=', $selectedMonthDate->copy()->endOfMonth()->toDateString())
            ->where('to_date', '>=', $selectedMonthDate->copy()->startOfMonth()->toDateString())
            ->count();

        return [
            'id' => 'human-resource',
            'label' => 'Human Resource',
            'description' => 'Staff attendance, payroll, and leave management.',
            'columns' => ['Employee ID', 'Name', 'Designation', 'Department', 'Role', 'Status'],
            'stats' => [
                ['label' => 'Total Staff', 'value' => (string) $totalStaff],
                ['label' => 'Present', 'value' => (string) $presentToday],
                ['label' => 'Pending Payroll', 'value' => (string) $pendingPayroll],
                ['label' => 'On Leave', 'value' => (string) $onLeave],
            ],
            'rows' => collect($staffPaginator->items())->map(fn (User $staff) => [
                $staff->employee_id ?: '-',
                $staff->name ?: '-',
                $staff->designation?->name ?: '-',
                $staff->department?->name ?: '-',
                ucfirst(str_replace('_', ' ', (string) $staff->role)),
                ucfirst((string) $staff->status),
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $staffPaginator->currentPage(),
                'lastPage' => $staffPaginator->lastPage(),
                'total' => $staffPaginator->total(),
                'perPage' => $staffPaginator->perPage(),
            ],
        ];
    }

    private function homeworkModuleReport(Organization $organization, string $selectedClass, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();

        $query = Homework::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('assign_date', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->toDateString(),
            ])
            ->with(['schoolClass:id,name,section', 'subject:id,name,name_mr,name_hi', 'teacher:id,name', 'submissions'])
            ->when($selectedClass !== 'all', fn ($q) => $q->where('class_id', $selectedClass))
            ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%"))
            ->latest('assign_date');

        $paginator = (clone $query)
            ->paginate(15, ['*'], 'page', $page);

        $baseQuery = Homework::query()
            ->where('organization_id', $organization->id)
            ->when($selectedClass !== 'all', fn ($q) => $q->where('class_id', $selectedClass));

        $totalAssigned = (clone $baseQuery)->count();
        $totalSubmissions = HomeworkSubmission::query()
            ->whereHas('homework', fn ($q) => $q->where('organization_id', $organization->id))
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->count();
        $pendingReview = HomeworkSubmission::query()
            ->whereHas('homework', fn ($q) => $q->where('organization_id', $organization->id))
            ->where('status', 'submitted')
            ->count();
        $evaluated = HomeworkSubmission::query()
            ->whereHas('homework', fn ($q) => $q->where('organization_id', $organization->id))
            ->where('status', 'evaluated')
            ->count();

        return [
            'id' => 'homework',
            'label' => 'Homework',
            'description' => 'Homework assignments, submissions, and evaluation status.',
            'columns' => ['Date', 'Subject', 'Class', 'Teacher', 'Submissions', 'Max Marks'],
            'stats' => [
                ['label' => 'Total Assigned', 'value' => (string) $totalAssigned],
                ['label' => 'Submissions', 'value' => (string) $totalSubmissions],
                ['label' => 'Pending Review', 'value' => (string) $pendingReview],
                ['label' => 'Evaluated', 'value' => (string) $evaluated],
            ],
            'rows' => collect($paginator->items())->map(fn (Homework $hw) => [
                optional($hw->assign_date)->format('d M Y') ?: '-',
                $hw->subject?->localized('name') ?: '-',
                $this->classLabel($hw->schoolClass),
                $hw->teacher?->name ?: '-',
                (string) $hw->submissions()->count(),
                $hw->max_marks ? (string) $hw->max_marks : '-',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function alumniModuleReport(Organization $organization, int $page = 1, string $search = ''): array
    {
        $paginator = AlumniRecord::query()
            ->where('organization_id', $organization->id)
            ->when($search !== '', fn ($q) => $q->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")->orWhere('admission_no', 'like', "%{$search}%"))
            ->latest('created_at')
            ->paginate(15, ['*'], 'page', $page);

        $totalAlumni = AlumniRecord::query()->where('organization_id', $organization->id)->count();
        $leftSchool = AlumniRecord::query()->where('organization_id', $organization->id)->where('alumni_status', 'left_school')->count();
        $passedOut = AlumniRecord::query()->where('organization_id', $organization->id)->where('alumni_status', 'passed_out')->count();
        $transferred = AlumniRecord::query()->where('organization_id', $organization->id)->where('alumni_status', 'transferred')->count();

        return [
            'id' => 'alumni',
            'label' => 'Alumni',
            'description' => 'Alumni records, pass-out statistics, and contact details.',
            'columns' => ['Name', 'Class', 'Passing Year', 'Status', 'Current City', 'Phone'],
            'stats' => [
                ['label' => 'Total Alumni', 'value' => (string) $totalAlumni],
                ['label' => 'Left School', 'value' => (string) $leftSchool],
                ['label' => 'Passed Out', 'value' => (string) $passedOut],
                ['label' => 'Transferred', 'value' => (string) $transferred],
            ],
            'rows' => collect($paginator->items())->map(fn (AlumniRecord $record) => [
                trim(($record->first_name ?? '') . ' ' . ($record->last_name ?? '')) ?: '-',
                $record->class ? 'Class ' . $record->class . ($record->section ? ' - ' . $record->section : '') : '-',
                $record->passing_year ?: '-',
                ucfirst(str_replace('_', ' ', (string) $record->alumni_status)),
                $record->current_city ?: '-',
                $record->phone ?: '-',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function activityLogModuleReport(Organization $organization, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();

        $paginator = ActivityLog::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->when($search !== '', fn ($q) => $q->where('description', 'like', "%{$search}%")->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%")))
            ->with('user:id,name')
            ->latest()
            ->paginate(15, ['*'], 'page', $page);

        $totalLogins = ActivityLog::query()
            ->where('organization_id', $organization->id)
            ->where('action', 'login')
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->count();

        $totalLogouts = ActivityLog::query()
            ->where('organization_id', $organization->id)
            ->where('action', 'logout')
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->count();

        $uniqueUsers = ActivityLog::query()
            ->where('organization_id', $organization->id)
            ->where('action', 'login')
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->distinct('user_id')
            ->count('user_id');

        return [
            'id' => 'activity-log',
            'label' => 'Activity Log',
            'description' => 'Login and logout activity tracking for all users.',
            'columns' => ['Timestamp', 'User', 'Action', 'Description', 'IP Address', 'Device'],
            'stats' => [
                ['label' => 'Total Logins', 'value' => (string) $totalLogins],
                ['label' => 'Logouts', 'value' => (string) $totalLogouts],
                ['label' => 'Unique Users', 'value' => (string) $uniqueUsers],
            ],
            'rows' => collect($paginator->items())->map(fn (ActivityLog $log) => [
                optional($log->created_at)->format('d M Y, H:i') ?: '-',
                $log->user?->name ?: '-',
                ucfirst((string) $log->action),
                $log->description ?: '-',
                $log->ip_address ?: '-',
                $log->user_agent ? substr($log->user_agent, 0, 40) : '-',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
        ];
    }

    private function auditTrailModuleReport(Organization $organization, string $selectedMonth, int $page = 1, string $search = ''): array
    {
        $selectedMonthDate = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();

        $paginator = AuditTrail::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->when($search !== '', fn ($q) => $q->where('description', 'like', "%{$search}%"))
            ->with('user:id,name')
            ->latest()
            ->paginate(15, ['*'], 'page', $page);

        $totalEvents = AuditTrail::query()
            ->where('organization_id', $organization->id)
            ->whereBetween('created_at', [
                $selectedMonthDate->copy()->startOfMonth()->toDateString(),
                $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
            ])
            ->count();

        $created = AuditTrail::query()->where('organization_id', $organization->id)->where('action', 'created')->whereBetween('created_at', [
            $selectedMonthDate->copy()->startOfMonth()->toDateString(),
            $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
        ])->count();

        $updated = AuditTrail::query()->where('organization_id', $organization->id)->where('action', 'updated')->whereBetween('created_at', [
            $selectedMonthDate->copy()->startOfMonth()->toDateString(),
            $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
        ])->count();

        $deleted = AuditTrail::query()->where('organization_id', $organization->id)->where('action', 'deleted')->whereBetween('created_at', [
            $selectedMonthDate->copy()->startOfMonth()->toDateString(),
            $selectedMonthDate->copy()->endOfMonth()->endOfDay()->toDateTimeString(),
        ])->count();

        return [
            'id' => 'audit-trail',
            'label' => 'Audit Trail',
            'description' => 'System audit trail for data changes and critical actions.',
            'columns' => ['Timestamp', 'User', 'Action', 'Model', 'Description', 'IP Address'],
            'stats' => [
                ['label' => 'Total Events', 'value' => (string) $totalEvents],
                ['label' => 'Created', 'value' => (string) $created],
                ['label' => 'Updated', 'value' => (string) $updated],
                ['label' => 'Deleted', 'value' => (string) $deleted],
            ],
            'rows' => collect($paginator->items())->map(fn (AuditTrail $trail) => [
                optional($trail->created_at)->format('d M Y, H:i') ?: '-',
                $trail->user?->name ?: '-',
                ucfirst((string) $trail->action),
                class_basename((string) $trail->model_type) ?: '-',
                $trail->description ?: '-',
                $trail->ip_address ?: '-',
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
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

    private function monthOptionsFor(Carbon $start, Carbon $end): Collection
    {
        return $this->monthSequenceBetween($start, $end)
            ->map(fn (Carbon $month) => [
                'value' => $month->format('Y-m'),
                'label' => $month->format('M Y'),
            ])
            ->values();
    }

    private function monthSequenceBetween(Carbon $start, Carbon $end): Collection
    {
        $months = collect();
        $cursor = $start->copy()->startOfMonth();
        $endCursor = $end->copy()->startOfMonth();

        while ($cursor->lte($endCursor)) {
            $months->push($cursor->copy());
            $cursor->addMonth();
        }

        return $months;
    }

    private function semesterOptions(AcademicYear $selectedAcademicYear): Collection
    {
        return Semester::query()
            ->where('organization_id', $selectedAcademicYear->organization_id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->orderBy('sem_no')
            ->get(['id', 'name'])
            ->map(fn (Semester $semester) => [
                'value' => (string) $semester->id,
                'label' => $semester->name,
            ])
            ->values();
    }

    private function resolveSelectedSemester(Organization $organization, AcademicYear $selectedAcademicYear, mixed $input): ?Semester
    {
        if (!$input || $input === 'all') {
            return null;
        }

        return Semester::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $selectedAcademicYear->id)
            ->find($input);
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

    private function resolveSelectedMonth(Carbon $periodStart, Carbon $periodEnd, mixed $selectedMonth): string
    {
        $validMonths = $this->monthOptionsFor($periodStart, $periodEnd)->pluck('value');

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

        return $class->name . ($class->section ? ' - ' . $class->section : '');
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
