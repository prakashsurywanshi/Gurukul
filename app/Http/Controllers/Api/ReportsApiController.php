<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\StudentFee;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\ExamResult;
use App\Models\User;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\TransportAssignment;
use App\Models\HostelRoom;
use App\Models\HostelAllocation;
use App\Models\FeePayment;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class ReportsApiController extends Controller
{
    /**
     * Organization every report query is scoped to.
     *
     * These endpoints were previously global: every aggregation ran across all
     * organizations, so a report in one school leaked student counts, fee
     * totals and names from every other school on the instance. Resolved from
     * the authenticated user and cached per-request.
     */
    private ?int $organizationId = null;

    private function organizationId(Request $request): int
    {
        if ($this->organizationId !== null) {
            return $this->organizationId;
        }

        $organizationId = $request->user()?->organization_id;

        abort_if(! $organizationId, 403, 'No organization is linked to this account.');

        return $this->organizationId = (int) $organizationId;
    }

    public function analytics(Request $request)
    {
        $organizationId = $this->organizationId($request);
        $selectedClass = $request->input('class', 'all');
        $selectedMonth = (int) ($request->input('month', now()->month));
        $selectedYear = (int) ($request->input('year', now()->year));

        return response()->json([
            'success' => true,
            'data' => [
                'classOptions' => $this->getClassOptions($organizationId),
                'selectedFilters' => [
                    'class' => $selectedClass,
                    'month' => (string) $selectedMonth,
                    'year' => (string) $selectedYear,
                ],
                'attendanceData' => $this->attendanceData($organizationId, $selectedClass, $selectedYear),
                'feeCollectionData' => $this->feeCollectionData($organizationId, $selectedClass, $selectedYear),
                'studentDistribution' => $this->studentDistribution($organizationId),
                'examPerformance' => $this->examPerformance($organizationId, $selectedClass, $selectedYear),
                'metrics' => $this->metrics($organizationId, $selectedClass, $selectedMonth, $selectedYear),
                'yearOptions' => $this->yearOptions($organizationId),
                'monthOptions' => collect(range(1, 12))->map(fn (int $month) => [
                    'value' => (string) $month,
                    'label' => Carbon::create()->month($month)->format('M'),
                ])->values(),
            ],
        ]);
    }

    private function getClassOptions(int $organizationId)
    {
        return SchoolClass::query()
            ->where('organization_id', $organizationId)
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

    private function attendanceData(int $organizationId, string $selectedClass, int $selectedYear)
    {
        $attendance = Attendance::query()
            ->where('organization_id', $organizationId)
            ->whereYear('date', $selectedYear)
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->get(['date', 'status']);

        return collect(range(1, 12))->map(function (int $month) use ($attendance) {
            $monthEntries = $attendance->filter(fn ($entry) => optional($entry->date)->month === $month);
            $total = $monthEntries->count();
            $present = $monthEntries->filter(fn ($entry) => in_array($entry->status, ['present', 'late', 'half_day'], true))->count();
            $absent = $monthEntries->filter(fn ($entry) => $entry->status === 'absent')->count();

            return [
                'month' => Carbon::create()->month($month)->format('M'),
                'present' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                'absent' => $total > 0 ? round(($absent / $total) * 100, 1) : 0,
            ];
        })->values();
    }

    private function feeCollectionData(int $organizationId, string $selectedClass, int $selectedYear)
    {
        // `status` must be `success`, which is the value every writer uses
        // (FeesApiController, FeesController). It was previously filtered as
        // `completed`, which matches no rows, so the "collected" series was
        // always empty while "pending" still showed real balances.
        $payments = FeePayment::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'success')
            ->whereYear('payment_date', $selectedYear)
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->get(['amount', 'payment_date']);

        $studentFees = StudentFee::query()
            ->where('organization_id', $organizationId)
            ->where('year', $selectedYear)
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->get(['net_amount', 'balance', 'month']);

        return collect(range(1, 12))->map(function (int $month) use ($payments, $studentFees) {
            $collected = $payments
                ->filter(fn ($payment) => optional($payment->payment_date)->month === $month)
                ->sum(fn ($payment) => (float) $payment->amount);

            $pending = $studentFees
                ->filter(fn ($fee) => (int) $fee->month === $month)
                ->sum(fn ($fee) => (float) ($fee->balance ?? max(0, (float) $fee->net_amount)));

            return [
                'month' => Carbon::create()->month($month)->format('M'),
                'collected' => round($collected, 2),
                'pending' => round($pending, 2),
            ];
        })->values();
    }

    private function studentDistribution(int $organizationId)
    {
        $students = Student::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->with('schoolClass:id,name')
            ->get();

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

    private function examPerformance(int $organizationId, string $selectedClass, int $selectedYear)
    {
        return ExamResult::query()
            ->where('organization_id', $organizationId)
            ->whereHas('examSchedule', function ($query) use ($selectedClass, $selectedYear) {
                $query->whereYear('exam_date', $selectedYear)
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

    private function metrics(int $organizationId, string $selectedClass, int $selectedMonth, int $selectedYear): array
    {
        $studentsQuery = Student::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass));

        $totalStudents = $studentsQuery->count();

        $attendance = Attendance::query()
            ->where('organization_id', $organizationId)
            ->whereYear('date', $selectedYear)
            ->whereMonth('date', $selectedMonth)
            ->when($selectedClass !== 'all', fn ($query) => $query->where('class_id', $selectedClass))
            ->get(['status']);

        $attendanceTotal = $attendance->count();
        $attendancePresent = $attendance->filter(fn ($entry) => in_array($entry->status, ['present', 'late', 'half_day'], true))->count();
        $attendanceRate = $attendanceTotal > 0 ? round(($attendancePresent / $attendanceTotal) * 100, 1) : 0;

        $feeCollected = FeePayment::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'success')
            ->whereYear('payment_date', $selectedYear)
            ->whereMonth('payment_date', $selectedMonth)
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->sum('amount');

        $monthlyFeeDemand = StudentFee::query()
            ->where('organization_id', $organizationId)
            ->where('year', $selectedYear)
            ->where('month', $selectedMonth)
            ->when($selectedClass !== 'all', function ($query) use ($selectedClass) {
                $query->whereHas('student', fn ($studentQuery) => $studentQuery->where('class_id', $selectedClass));
            })
            ->sum('net_amount');

        $booksCount = LibraryBook::query()
            ->where('organization_id', $organizationId)
            ->sum('total_copies');
        $issuedCount = LibraryCirculation::query()
            ->where('organization_id', $organizationId)
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

    private function yearOptions(int $organizationId)
    {
        $years = collect([
            now()->year,
            now()->year - 1,
            now()->year - 2,
        ])
            ->merge(
                Attendance::query()
                    ->where('organization_id', $organizationId)
                    ->selectRaw('DISTINCT '.$this->yearExpression('date').' as year')
                    ->pluck('year')
            )
            ->merge(
                FeePayment::query()
                    ->where('organization_id', $organizationId)
                    ->selectRaw('DISTINCT '.$this->yearExpression('payment_date').' as year')
                    ->pluck('year')
            )
            ->merge(
                ExamResult::query()
                    ->where('exam_results.organization_id', $organizationId)
                    ->join('exam_schedules', 'exam_results.exam_schedule_id', '=', 'exam_schedules.id')
                    ->selectRaw('DISTINCT '.$this->yearExpression('exam_schedules.exam_date').' as year')
                    ->pluck('year')
            )
            ->filter()
            ->map(fn ($year) => (int) $year)
            ->unique()
            ->sortDesc()
            ->values();

        return $years->map(fn (int $year) => [
            'value' => (string) $year,
            'label' => (string) $year,
        ]);
    }

    private function yearExpression(string $column): string
    {
        $driver = DB::connection()->getDriverName();

        return $driver === 'sqlite'
            ? "strftime('%Y', {$column})"
            : "YEAR({$column})";
    }
    public function overview(Request $request)
    {
        $organizationId = $this->organizationId($request);

        $totalStudents = Student::where('organization_id', $organizationId)->count();
        $totalStaff = User::where('organization_id', $organizationId)->where('role', '!=', 'super_admin')->count();
        $totalClasses = SchoolClass::where('organization_id', $organizationId)->count();
        $totalBooks = LibraryBook::where('organization_id', $organizationId)->count();
        $totalRoutes = TransportRoute::where('organization_id', $organizationId)->count();
        // hostel_rooms has no organization_id column; scope through the
        // owning hostel, which does.
        $totalHostelRooms = HostelRoom::whereHas('hostel', fn ($q) => $q->where('organization_id', $organizationId))->count();

        $reports = [
            ['name' => 'Attendance Report', 'endpoint' => '/api/reports/attendance', 'method' => 'GET', 'params' => ['class', 'month', 'year']],
            ['name' => 'Fee Collection Report', 'endpoint' => '/api/reports/fee', 'method' => 'GET', 'params' => ['class', 'from_date', 'to_date']],
            ['name' => 'Exam Results Report', 'endpoint' => '/api/reports/exam', 'method' => 'GET', 'params' => ['exam_id', 'class']],
            ['name' => 'Student Progress Report', 'endpoint' => '/api/reports/progress', 'method' => 'GET', 'params' => ['student_id']],
            ['name' => 'Staff Report', 'endpoint' => '/api/reports/staff', 'method' => 'GET', 'params' => []],
            ['name' => 'Library Report', 'endpoint' => '/api/reports/library', 'method' => 'GET', 'params' => ['month', 'year']],
            ['name' => 'Transport Report', 'endpoint' => '/api/reports/transport', 'method' => 'GET', 'params' => []],
            ['name' => 'Hostel Report', 'endpoint' => '/api/reports/hostel', 'method' => 'GET', 'params' => []],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'reports' => $reports,
                'summary' => [
                    'total_students' => $totalStudents,
                    'total_staff' => $totalStaff,
                    'total_classes' => $totalClasses,
                    'total_books' => $totalBooks,
                    'total_routes' => $totalRoutes,
                    'total_hostel_rooms' => $totalHostelRooms,
                ]
            ],
            'meta' => [
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function attendance(Request $request)
    {
        $query = Attendance::where('organization_id', $this->organizationId($request))
            ->with(['student', 'schoolClass']);

        if ($request->has('class')) {
            $query->where('class_id', $request->class);
        }

        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        } elseif ($request->has('month')) {
            $query->whereMonth('date', $request->month);
        } elseif ($request->has('year')) {
            $query->whereYear('date', $request->year);
        }

        $attendances = $query->get();

        $presentCount = $attendances->where('status', 'present')->count();
        $absentCount = $attendances->where('status', 'absent')->count();
        $lateCount = $attendances->where('status', 'late')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'attendances' => $attendances,
                'statistics' => [
                    'total_records' => $attendances->count(),
                    'present' => $presentCount,
                    'absent' => $absentCount,
                    'late' => $lateCount,
                    'attendance_rate' => $attendances->count() > 0 ? round(($presentCount / $attendances->count()) * 100, 2) : 0,
                ]
            ],
            'meta' => [
                'filters' => $request->only(['class', 'month', 'year']),
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function fee(Request $request)
    {
        $query = StudentFee::where('organization_id', $this->organizationId($request))
            ->with(['student', 'feeStructure']);

        if ($request->has('class')) {
            $query->whereHas('student', function ($q) use ($request) {
                $q->where('class_id', $request->class);
            });
        }

        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $fees = $query->get();

        $totalAmount = $fees->sum('amount');
        $totalPaid = $fees->sum('paid_amount');
        $totalBalance = $fees->sum('balance');
        $totalDiscount = $fees->sum('discount');
        $totalFine = $fees->sum('fine');

        return response()->json([
            'success' => true,
            'data' => [
                'fees' => $fees,
                'summary' => [
                    'total_records' => $fees->count(),
                    'total_amount' => $totalAmount,
                    'total_paid' => $totalPaid,
                    'total_balance' => $totalBalance,
                    'total_discount' => $totalDiscount,
                    'total_fine' => $totalFine,
                    'collection_rate' => $totalAmount > 0 ? round(($totalPaid / $totalAmount) * 100, 2) : 0,
                ]
            ],
            'meta' => [
                'filters' => $request->only(['class', 'from_date', 'to_date']),
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function exam(Request $request)
    {
        // `exam_schedules` has no organization_id column; the owning `exams` row does,
        // so scope through that relation rather than filtering a column that
        // does not exist.
        $query = ExamSchedule::whereHas('exam', fn ($q) => $q->where('organization_id', $this->organizationId($request)))
            ->with(['exam', 'schoolClass', 'subject', 'results.student']);

        if ($request->has('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->has('class')) {
            $query->where('class_id', $request->class);
        }

        $schedules = $query->get();

        $totalStudents = 0;
        $passedStudents = 0;
        $failedStudents = 0;
        $absentStudents = 0;

        foreach ($schedules as $schedule) {
            $totalStudents += $schedule->results->count();
            $passedStudents += $schedule->results->where('obtained_marks', '>=', $schedule->passing_marks)->count();
            $failedStudents += $schedule->results->where('obtained_marks', '<', $schedule->passing_marks)->where('is_absent', false)->count();
            $absentStudents += $schedule->results->where('is_absent', true)->count();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'exam_schedules' => $schedules,
                'statistics' => [
                    'total_schedules' => $schedules->count(),
                    'total_students_appeared' => $totalStudents,
                    'passed' => $passedStudents,
                    'failed' => $failedStudents,
                    'absent' => $absentStudents,
                    'pass_rate' => $totalStudents > 0 ? round(($passedStudents / $totalStudents) * 100, 2) : 0,
                ]
            ],
            'meta' => [
                'filters' => $request->only(['exam_id', 'class']),
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function progress(Request $request)
    {
        $organizationId = $this->organizationId($request);

        $request->validate([
            // Scoped rule: `exists:students,id` alone would accept a student id
            // belonging to another organization.
            'student_id' => [
                'required',
                'integer',
                Rule::exists('students', 'id')->where(fn ($query) => $query->where('organization_id', $organizationId)),
            ],
        ]);

        $student = Student::where('organization_id', $organizationId)
            ->with(['schoolClass', 'academicHistories'])
            ->find($request->student_id);

        $attendances = Attendance::where('organization_id', $organizationId)
            ->where('student_id', $request->student_id)
            ->with('schoolClass')
            ->get();

        $examResults = ExamResult::where('organization_id', $organizationId)
            ->where('student_id', $request->student_id)
            ->with(['examSchedule.exam', 'examSchedule.subject'])
            ->get();

        $fees = StudentFee::where('organization_id', $organizationId)
            ->where('student_id', $request->student_id)
            ->with('feeStructure')
            ->get();

        $attendanceRate = $attendances->count() > 0
            ? round(($attendances->where('status', 'present')->count() / $attendances->count()) * 100, 2)
            : 0;

        $averageMarks = $examResults->count() > 0
            ? round($examResults->avg('obtained_marks'), 2)
            : 0;

        $totalFeeDue = $fees->sum('balance');

        return response()->json([
            'success' => true,
            'data' => [
                'student' => $student,
                'attendance_summary' => [
                    'total_records' => $attendances->count(),
                    'present' => $attendances->where('status', 'present')->count(),
                    'absent' => $attendances->where('status', 'absent')->count(),
                    'late' => $attendances->where('status', 'late')->count(),
                    'attendance_rate' => $attendanceRate,
                ],
                'exam_performance' => [
                    'total_exams' => $examResults->count(),
                    'average_marks' => $averageMarks,
                    'results' => $examResults,
                ],
                'fee_status' => [
                    'total_fees' => $fees->count(),
                    'total_paid' => $fees->sum('paid_amount'),
                    'total_due' => $totalFeeDue,
                    'fees' => $fees,
                ],
                'academic_history' => $student->academicHistories,
            ],
            'meta' => [
                'student_id' => $request->student_id,
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function staff(Request $request)
    {
        $staff = User::where('organization_id', $this->organizationId($request))
            ->where('role', '!=', 'super_admin')
            ->get();

        $activeStaff = $staff->where('status', 'active')->count();
        $inactiveStaff = $staff->where('status', 'inactive')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'staff' => $staff,
                'statistics' => [
                    'total_staff' => $staff->count(),
                    'active' => $activeStaff,
                    'inactive' => $inactiveStaff,
                ]
            ],
            'meta' => [
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function library(Request $request)
    {
        $organizationId = $this->organizationId($request);

        $query = LibraryCirculation::where('organization_id', $organizationId)
            ->with(['book', 'member']);

        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('issue_date', $request->month)
                  ->whereYear('issue_date', $request->year);
        } elseif ($request->has('month')) {
            $query->whereMonth('issue_date', $request->month);
        } elseif ($request->has('year')) {
            $query->whereYear('issue_date', $request->year);
        }

        $circulations = $query->get();

        $issued = $circulations->where('status', 'issued')->count();
        $returned = $circulations->where('status', 'returned')->count();
        $overdue = $circulations->where('status', 'issued')
            ->where('due_date', '<', now())
            ->count();

        $totalBooks = LibraryBook::where('organization_id', $organizationId)->count();
        $availableBooks = LibraryBook::where('organization_id', $organizationId)->sum('available_copies');

        return response()->json([
            'success' => true,
            'data' => [
                'circulations' => $circulations,
                'statistics' => [
                    'total_circulations' => $circulations->count(),
                    'issued' => $issued,
                    'returned' => $returned,
                    'overdue' => $overdue,
                    'total_books_in_library' => $totalBooks,
                    'available_copies' => $availableBooks,
                ]
            ],
            'meta' => [
                'filters' => $request->only(['month', 'year']),
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function transport(Request $request)
    {
        $organizationId = $this->organizationId($request);

        $routes = TransportRoute::where('organization_id', $organizationId)
            ->with(['vehicles', 'assignments.student'])
            ->get();
        $vehicles = TransportVehicle::where('organization_id', $organizationId)->with('route')->get();
        // transport_assignments has no organization_id column, so it is scoped
        // through the route it belongs to.
        // transport_assignments maps to the `student_transport` table, which has no
        // organization_id; it is scoped through the route it belongs to.
        $assignments = TransportAssignment::whereHas('route', fn ($q) => $q->where('organization_id', $organizationId))
            ->with(['student', 'route', 'vehicle'])
            ->get();

        $totalStudents = $assignments->count();
        $totalRoutes = $routes->count();
        $totalVehicles = $vehicles->count();

        return response()->json([
            'success' => true,
            'data' => [
                'routes' => $routes,
                'vehicles' => $vehicles,
                'assignments' => $assignments,
                'statistics' => [
                    'total_routes' => $totalRoutes,
                    'total_vehicles' => $totalVehicles,
                    'total_students_assigned' => $totalStudents,
                    'total_capacity' => $vehicles->sum('capacity'),
                ]
            ],
            'meta' => [
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    public function hostel(Request $request)
    {
        $organizationId = $this->organizationId($request);

        // Neither hostel_rooms nor hostel_allocations has organization_id, so
        // both are scoped through the owning hostel.
        $rooms = HostelRoom::whereHas('hostel', fn ($q) => $q->where('organization_id', $organizationId))
            ->with(['hostel', 'allocations.student', 'beds'])
            ->get();
        $allocations = HostelAllocation::whereHas('hostel', fn ($q) => $q->where('organization_id', $organizationId))
            ->with(['student', 'hostel', 'room'])
            ->get();

        $totalRooms = $rooms->count();
        $totalBeds = $rooms->sum('capacity');
        $occupiedBeds = $allocations->count();
        $availableBeds = $totalBeds - $occupiedBeds;

        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 2) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'rooms' => $rooms,
                'allocations' => $allocations,
                'statistics' => [
                    'total_rooms' => $totalRooms,
                    'total_beds' => $totalBeds,
                    'occupied_beds' => $occupiedBeds,
                    'available_beds' => $availableBeds,
                    'occupancy_rate' => $occupancyRate,
                    'total_students_hosteled' => $allocations->count(),
                ]
            ],
            'meta' => [
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }
}
