<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\Attendance;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\LibraryMember;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\IssuedCertificate;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\OnlineExam;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Services\StudentAcademicHistoryService;

class DashboardApiController extends Controller
{
    private const TRANSPORT_FEE_PREFIX = 'Transport Fee - ';

    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService
    ) {}

    public function index(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->staffPermissionService->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        if ($user->role === 'student') {
            return $this->studentDashboard($organization, $user);
        }

        return $this->adminDashboard($organization, $user);
    }

    private function adminDashboard(Organization $organization, User $user): JsonResponse
    {
        $today = now()->toDateString();
        $activeAcademicYearId = $this->studentAcademicHistoryService->getActiveAcademicYear($organization->id)?->id;

        $studentEnrollments = $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId);

        $students = $studentEnrollments
            ->map(function (StudentAcademicHistory $history) {
                $student = $history->student;
                if (!$student) return null;
                return ['student' => $student, 'history' => $history];
            })
            ->filter()
            ->values();

        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->where(function ($query) {
                $query
                    ->whereNotNull('transport_assignment_id')
                    ->orWhereDoesntHave('feeStructure', fn ($feeStructureQuery) => $feeStructureQuery->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'));
            })
            ->get();

        $libraryBooks = LibraryBook::query()->where('organization_id', $organization->id)->get();

        $todayAttendance = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', $today)
            ->get();

        $presentToday = $todayAttendance->whereIn('status', ['present', 'late'])->count();

        $studentsById = $students->keyBy(fn (array $entry) => $entry['student']->id);

        $followUps = $studentFees
            ->filter(fn (StudentFee $fee) => (float) $fee->balance > 0)
            ->sortBy([
                fn (StudentFee $fee) => optional($fee->due_date)->timestamp ?? PHP_INT_MAX,
                fn (StudentFee $fee) => -1 * (float) $fee->balance,
            ])
            ->take(5)
            ->values();

        $libraryAlerts = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['issued', 'overdue'])
            ->with(['book:id,title', 'member.student:id,first_name,last_name'])
            ->orderByRaw("case when status = 'overdue' then 0 else 1 end")
            ->orderBy('due_date')
            ->limit(4)
            ->get();

        $upcomingExams = ExamSchedule::query()
            ->whereHas('exam', fn ($query) => $query->where('organization_id', $organization->id))
            ->whereDate('exam_date', '>=', $today)
            ->with(['exam:id,name,organization_id', 'subject:id,name', 'schoolClass:id,name,section'])
            ->orderBy('exam_date')
            ->orderBy('start_time')
            ->limit(4)
            ->get();

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->get();
        $enrollmentByClass = $students->groupBy(fn (array $entry) => $entry['history']->class_id);

        $averageOccupancy = $classes->count() > 0
            ? round($classes->avg(function (SchoolClass $class) use ($enrollmentByClass) {
                $capacity = (int) ($class->capacity ?? 0);
                $enrolled = $enrollmentByClass->get($class->id)?->count() ?? 0;
                if ($capacity <= 0) return 0;
                return ($enrolled / $capacity) * 100;
            }), 2)
            : 0;

        $feeTotal = (float) $studentFees->sum('net_amount');
        $feeCollected = (float) $studentFees->sum('paid_amount');
        $feePending = (float) $studentFees->sum('balance');

        return response()->json([
            'success' => true,
            'data' => [
                'dashboardType' => 'admin',
                'students' => [
                    'total' => $students->count(),
                    'active' => $students->filter(fn (array $entry) => ($entry['history']->status ?: $entry['student']->status) === 'active')->count(),
                    'recentAdmissions' => $students
                        ->sortByDesc(fn (array $entry) => optional($entry['student']->admission_date)->timestamp ?? 0)
                        ->take(4)
                        ->values()
                        ->map(fn (array $entry) => [
                            'id' => (string) $entry['student']->id,
                            'name' => trim($entry['student']->first_name . ' ' . $entry['student']->last_name),
                            'className' => $entry['history']->schoolClass?->name ?? '-',
                            'section' => $entry['history']->schoolClass?->section ?? '-',
                            'admissionDate' => optional($entry['student']->admission_date)->format('Y-m-d') ?? 'N/A',
                        ])->all(),
                ],
                'fees' => [
                    'total' => $feeTotal,
                    'collected' => $feeCollected,
                    'pending' => $feePending,
                    'collectionRate' => $feeTotal > 0 ? round(($feeCollected / $feeTotal) * 100, 2) : 0,
                    'pendingCount' => $studentFees->filter(fn (StudentFee $fee) => (float) $fee->balance > 0)->count(),
                    'followUps' => $followUps->map(function (StudentFee $fee) use ($studentsById) {
                        $entry = $studentsById->get($fee->student_id);
                        return [
                            'id' => (string) $fee->id,
                            'studentName' => $entry ? trim($entry['student']->first_name . ' ' . $entry['student']->last_name) : 'Unknown Student',
                            'className' => $entry ? ($entry['history']->schoolClass?->name ?? '-') : '-',
                            'section' => $entry ? ($entry['history']->schoolClass?->section ?? '-') : '-',
                            'dueAmount' => (float) $fee->balance,
                            'dueDate' => optional($fee->due_date)->format('Y-m-d') ?? 'N/A',
                            'status' => $fee->status ?? 'pending',
                        ];
                    })->all(),
                ],
                'library' => [
                    'total_books' => $libraryBooks->count(),
                    'issued' => LibraryCirculation::query()->where('organization_id', $organization->id)->whereIn('status', ['issued', 'overdue'])->count(),
                    'overdue' => LibraryCirculation::query()->where('organization_id', $organization->id)->where('status', 'overdue')->count(),
                    'available' => (int) $libraryBooks->sum('available_copies'),
                    'alerts' => $libraryAlerts->map(fn (LibraryCirculation $circulation) => [
                        'id' => (string) $circulation->id,
                        'studentName' => trim(($circulation->member?->student?->first_name ?? 'Unknown') . ' ' . ($circulation->member?->student?->last_name ?? 'Student')),
                        'bookTitle' => $circulation->book?->title ?? 'Unknown Book',
                        'dueDate' => optional($circulation->due_date)->format('Y-m-d') ?? 'N/A',
                        'status' => $circulation->status,
                    ])->all(),
                ],
                'attendance' => [
                    'today' => $presentToday,
                    'total_today' => $todayAttendance->count(),
                    'percentage' => $todayAttendance->count() > 0 ? number_format(($presentToday / $todayAttendance->count()) * 100, 2, '.', '') : '0.00',
                    'absent_today' => $todayAttendance->where('status', 'absent')->count(),
                ],
                'classes' => [
                    'total' => $classes->count(),
                    'averageOccupancy' => $averageOccupancy,
                ],
                'exams' => [
                    'total' => Exam::query()->where('organization_id', $organization->id)->count(),
                    'upcoming' => $upcomingExams->map(fn (ExamSchedule $schedule) => [
                        'id' => (string) $schedule->id,
                        'name' => $schedule->exam?->name ?? 'Exam',
                        'subject' => $schedule->subject?->name ?? 'Subject',
                        'className' => $schedule->schoolClass?->name ?? '-',
                        'section' => $schedule->schoolClass?->section ?? '-',
                        'examDate' => optional($schedule->exam_date)->format('Y-m-d') ?? 'N/A',
                        'startTime' => $schedule->start_time ? Carbon::parse($schedule->start_time)->format('h:i A') : 'TBA',
                    ])->all(),
                ],
                'staff' => [
                    'active' => User::query()->where('organization_id', $organization->id)->whereNotIn('role', ['student', 'parent'])->where('status', 'active')->count(),
                    'inactive' => User::query()->where('organization_id', $organization->id)->whereNotIn('role', ['student', 'parent'])->where('status', 'inactive')->count(),
                ],
                'communication' => [
                    'unread' => MessageRecipient::query()->where('recipient_id', $user->id)->where('is_read', false)->count(),
                ],
                'organization' => [
                    'name' => $organization->name,
                    'logo' => $organization->logo,
                ],
            ],
        ]);
    }

    private function studentDashboard(Organization $organization, User $user): JsonResponse
    {
        $student = Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)->orWhere('email', $user->email);
            })
            ->with('schoolClass:id,name,section')
            ->first();

        $studentEnrollment = $student
            ? $this->studentAcademicHistoryService->getSessionEnrollmentForStudent($student)
            : null;

        if (!$student) {
            return response()->json([
                'success' => true,
                'data' => [
                    'dashboardType' => 'student',
                    'overview' => [
                        'attendancePercentage' => '0.00',
                        'pendingFees' => 0,
                        'certificateCount' => 0,
                        'homeworkPending' => 0,
                        'upcomingExamCount' => 0,
                        'unreadMessages' => 0,
                    ],
                    'attendance' => ['present' => 0, 'total' => 0, 'absent' => 0, 'late' => 0, 'percentage' => '0.00'],
                    'fees' => ['pending' => 0, 'paid' => 0, 'pendingCount' => 0],
                    'homework' => ['pendingCount' => 0, 'items' => []],
                    'exams' => ['upcoming' => []],
                    'library' => ['issued' => 0, 'overdue' => 0, 'items' => []],
                ],
            ]);
        }

        $attendanceRecords = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->when($studentEnrollment?->class_id, fn ($query) => $query->where('class_id', $studentEnrollment->class_id))
            ->get();
        $attendancePresent = $attendanceRecords->whereIn('status', ['present', 'late'])->count();

        $activeAcademicYearId = $studentEnrollment?->academic_year_id ?: $this->studentAcademicHistoryService->getActiveAcademicYear($organization->id)?->id;

        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->where(function ($query) {
                $query
                    ->whereNotNull('transport_assignment_id')
                    ->orWhereDoesntHave('feeStructure', fn ($feeStructureQuery) => $feeStructureQuery->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'));
            })
            ->get();

        $homeworkItems = Homework::query()
            ->where('organization_id', $organization->id)
            ->when($studentEnrollment?->class_id, fn ($query) => $query->where('class_id', $studentEnrollment->class_id))
            ->with(['subject:id,name', 'teacher:id,name'])
            ->orderBy('due_date')
            ->limit(6)
            ->get();
        $submittedHomeworkIds = HomeworkSubmission::query()->where('student_id', $student->id)->pluck('homework_id')->all();

        $upcomingExams = OnlineExam::query()
            ->where('organization_id', $organization->id)
            ->where('class_name', $studentEnrollment?->schoolClass?->name)
            ->where('section', $studentEnrollment?->schoolClass?->section)
            ->where('end_time', '>=', now())
            ->orderBy('start_time')
            ->limit(4)
            ->get();

        $libraryMember = LibraryMember::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->first();
        $libraryItems = $libraryMember
            ? LibraryCirculation::query()
                ->where('library_member_id', $libraryMember->id)
                ->whereIn('status', ['issued', 'overdue'])
                ->with('book:id,title')
                ->orderByRaw("case when status = 'overdue' then 0 else 1 end")
                ->orderBy('due_date')
                ->limit(4)
                ->get()
            : collect();

        $issuedCertificateCount = IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->count();
        $unreadMessages = MessageRecipient::query()
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->count();

        $pendingHomeworkCount = $homeworkItems->filter(fn (Homework $homework) => !in_array($homework->id, $submittedHomeworkIds, true))->count();

        return response()->json([
            'success' => true,
            'data' => [
                'dashboardType' => 'student',
                'studentRecord' => [
                    'id' => (string) $student->id,
                    'name' => trim($student->first_name . ' ' . $student->last_name),
                    'admissionNo' => $student->admission_no,
                    'rollNumber' => $studentEnrollment?->roll_number ?: $student->roll_number,
                    'className' => $studentEnrollment?->schoolClass?->name ?? $student->schoolClass?->name ?? '-',
                    'section' => $studentEnrollment?->schoolClass?->section ?? $student->schoolClass?->section ?? '-',
                ],
                'overview' => [
                    'attendancePercentage' => $attendanceRecords->count() > 0 ? number_format(($attendancePresent / $attendanceRecords->count()) * 100, 2, '.', '') : '0.00',
                    'pendingFees' => (float) $studentFees->sum('balance'),
                    'certificateCount' => $issuedCertificateCount,
                    'homeworkPending' => $pendingHomeworkCount,
                    'upcomingExamCount' => $upcomingExams->count(),
                    'unreadMessages' => $unreadMessages,
                ],
                'attendance' => [
                    'present' => $attendancePresent,
                    'total' => $attendanceRecords->count(),
                    'absent' => $attendanceRecords->where('status', 'absent')->count(),
                    'late' => $attendanceRecords->where('status', 'late')->count(),
                    'percentage' => $attendanceRecords->count() > 0 ? number_format(($attendancePresent / $attendanceRecords->count()) * 100, 2, '.', '') : '0.00',
                ],
                'fees' => [
                    'pending' => (float) $studentFees->sum('balance'),
                    'paid' => (float) $studentFees->sum('paid_amount'),
                    'pendingCount' => $studentFees->filter(fn (StudentFee $fee) => (float) $fee->balance > 0)->count(),
                ],
                'homework' => [
                    'pendingCount' => $pendingHomeworkCount,
                    'items' => $homeworkItems->map(fn (Homework $homework) => [
                        'id' => (string) $homework->id,
                        'title' => $homework->title,
                        'subject' => $homework->subject?->name ?? 'Subject',
                        'teacher' => $homework->teacher?->name ?? 'Teacher',
                        'dueDate' => optional($homework->due_date)->format('Y-m-d') ?? 'N/A',
                        'status' => in_array($homework->id, $submittedHomeworkIds, true) ? 'submitted' : 'pending',
                    ])->all(),
                ],
                'exams' => [
                    'upcoming' => $upcomingExams->map(fn (OnlineExam $exam) => [
                        'id' => (string) $exam->id,
                        'title' => $exam->title,
                        'subject' => $exam->subject,
                        'startTime' => optional($exam->start_time)?->format('Y-m-d h:i A') ?? 'TBA',
                        'endTime' => optional($exam->end_time)?->format('Y-m-d h:i A') ?? 'TBA',
                        'duration' => $exam->duration,
                    ])->all(),
                ],
                'library' => [
                    'issued' => $libraryItems->count(),
                    'overdue' => $libraryItems->where('status', 'overdue')->count(),
                    'items' => $libraryItems->map(fn (LibraryCirculation $circulation) => [
                        'id' => (string) $circulation->id,
                        'title' => $circulation->book?->title ?? 'Library Book',
                        'dueDate' => optional($circulation->due_date)->format('Y-m-d') ?? 'N/A',
                        'status' => $circulation->status,
                    ])->all(),
                ],
            ],
        ]);
    }
}
