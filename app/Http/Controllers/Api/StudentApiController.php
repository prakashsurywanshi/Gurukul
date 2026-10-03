<?php

namespace App\Http\Controllers\Api;

use App\Support\LanguageCatalog;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\IssuedCertificate;
use App\Models\LibraryCirculation;
use App\Models\LibraryMember;
use App\Models\MessageRecipient;
use App\Models\OnlineExam;
use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentApiController extends Controller
{
    public function __construct(
        private readonly StudentAcademicHistoryService $academicHistoryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $query = Student::query()
            ->forCurrentSession($organization->id)
            ->with(['schoolClass:id,name,section'])
            ->orderByDesc('created_at');

        if ($request->filled('class')) {
            $query->whereHas('schoolClass', fn ($q) => $q->where('name', $request->class));
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('admission_no', 'like', "%{$search}%")
                    ->orWhere('roll_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $students = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $students->map(fn ($s) => $this->formatStudentItem($s)),
            'meta' => [
                'current_page' => $students->currentPage(),
                'last_page' => $students->lastPage(),
                'per_page' => $students->perPage(),
                'total' => $students->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:students,email,NULL,id,deleted_at,NULL'],
            'phone' => ['nullable', 'string', 'max:20'],
            'gender' => ['nullable', 'string', 'max:10'],
            'date_of_birth' => ['nullable', 'date'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'admission_no' => ['sometimes', 'string', 'unique:students,admission_no,NULL,id,organization_id,' . $organization->id . ',deleted_at,NULL'],
            'roll_number' => ['nullable', 'string', 'max:50'],
            'admission_date' => ['nullable', 'date'],
            'category' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', 'string', 'max:100'],
            'caste' => ['nullable', 'string', 'max:100'],
            'current_address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:10'],
            'father_name' => ['nullable', 'string', 'max:100'],
            'father_phone' => ['nullable', 'string', 'max:20'],
            'father_occupation' => ['nullable', 'string', 'max:100'],
            'mother_name' => ['nullable', 'string', 'max:100'],
            'mother_phone' => ['nullable', 'string', 'max:20'],
            'mother_occupation' => ['nullable', 'string', 'max:100'],
            'class' => ['nullable', 'string', 'max:255'],
            'section' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:20'],
        ]);

        if (empty($validated['admission_no'])) {
            $year = date('Y');
            $lastStudent = Student::query()
                ->where('organization_id', $organization->id)
                ->where('admission_no', 'like', "ADM{$year}%")
                ->orderByDesc('admission_no')
                ->first();

            if ($lastStudent) {
                $lastNumber = intval(substr($lastStudent->admission_no, -3));
                $validated['admission_no'] = 'ADM' . $year . str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
            } else {
                $validated['admission_no'] = 'ADM' . $year . '001';
            }
        }

        if (!empty($validated['class']) && !empty($validated['section'])) {
            $schoolClass = SchoolClass::query()
                ->where('organization_id', $organization->id)
                ->where('name', $validated['class'])
                ->where('section', $validated['section'])
                ->where('status', 'active')
                ->first();

            if (!$schoolClass) {
                $activeAcademicYearId = AcademicYear::query()
                    ->where('organization_id', $organization->id)
                    ->where('is_current', true)
                    ->value('id');

                $schoolClass = SchoolClass::query()->create([
                    'organization_id' => $organization->id,
                    'academic_year_id' => $activeAcademicYearId,
                    'name' => $validated['class'],
                    'section' => $validated['section'],
                    'status' => 'active',
                ]);
            }

            $validated['class_id'] = $schoolClass->id;
        }

        try {
            $student = Student::create([
                'organization_id' => $organization->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'] ?? null,
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
                'blood_group' => $validated['blood_group'] ?? null,
                'admission_no' => $validated['admission_no'],
                'roll_number' => $validated['roll_number'] ?? null,
                'admission_date' => $validated['admission_date'] ?? null,
                'category' => $validated['category'] ?? null,
                'religion' => $validated['religion'] ?? null,
                'caste' => $validated['caste'] ?? null,
                'current_address' => $validated['current_address'] ?? null,
                'city' => $validated['city'] ?? null,
                'state' => $validated['state'] ?? null,
                'pincode' => $validated['pincode'] ?? null,
                'father_name' => $validated['father_name'] ?? null,
                'father_phone' => $validated['father_phone'] ?? null,
                'father_occupation' => $validated['father_occupation'] ?? null,
                'mother_name' => $validated['mother_name'] ?? null,
                'mother_phone' => $validated['mother_phone'] ?? null,
                'mother_occupation' => $validated['mother_occupation'] ?? null,
                'class_id' => $validated['class_id'] ?? null,
                'status' => $validated['status'] ?? 'active',
            ]);

            \Illuminate\Support\Facades\Log::info('[StudentApi] Student created', ['id' => $student->id, 'admission_no' => $student->admission_no]);

            $this->academicHistoryService->syncCurrentRecord($student->fresh('schoolClass'), 'admission', 'Created from API.');

            \Illuminate\Support\Facades\Log::info('[StudentApi] Academic history synced', ['student_id' => $student->id]);

            return response()->json(['success' => true, 'message' => 'Student created successfully'], 201);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[StudentApi] Student creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create student: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $student = Student::query()
            ->where('organization_id', $organization->id)
            ->where('id', $id)
            ->with(['schoolClass:id,name,section'])
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $this->formatStudentItem($student)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $student = Student::query()
            ->where('organization_id', $organization->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:students,email,' . $id . ',id,deleted_at,NULL'],
            'phone' => ['nullable', 'string', 'max:20'],
            'gender' => ['nullable', 'string', 'max:10'],
            'date_of_birth' => ['nullable', 'date'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'admission_no' => ['sometimes', 'string', 'unique:students,admission_no,' . $id . ',id,organization_id,' . $organization->id . ',deleted_at,NULL'],
            'roll_number' => ['nullable', 'string', 'max:50'],
            'admission_date' => ['nullable', 'date'],
            'category' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', 'string', 'max:100'],
            'caste' => ['nullable', 'string', 'max:100'],
            'current_address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:10'],
            'father_name' => ['nullable', 'string', 'max:100'],
            'father_phone' => ['nullable', 'string', 'max:20'],
            'father_occupation' => ['nullable', 'string', 'max:100'],
            'mother_name' => ['nullable', 'string', 'max:100'],
            'mother_phone' => ['nullable', 'string', 'max:20'],
            'mother_occupation' => ['nullable', 'string', 'max:100'],
            'class_id' => ['nullable', 'exists:classes,id'],
            'status' => ['nullable', 'string', 'max:20'],
        ]);

        DB::transaction(function () use ($validated, $student) {
            $student->update($validated);
        });

        return response()->json(['success' => true, 'message' => 'Student updated successfully']);
    }

    public function destroy(int $id): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $student = Student::query()
            ->where('organization_id', $organization->id)
            ->where('id', $id)
            ->firstOrFail();

        $student->delete();

        return response()->json(['success' => true, 'message' => 'Student deleted successfully']);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $validated = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['ids'])
            ->delete();

        return response()->json(['success' => true, 'message' => 'Students deleted successfully']);
    }

    public function bulkDeleteList(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn ($s) => $this->formatStudentItem($s));

        return response()->json(['success' => true, 'data' => $students]);
    }

    public function getClassOptions(): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $classes = \App\Models\SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->orderBy('name')
            ->get(['id', 'name', 'section']);

        return response()->json(['success' => true, 'data' => $classes]);
    }

    public function alumniRecords(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $query = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'alumni')
            ->with(['schoolClass:id,name,section'])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        $alumni = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $alumni->map(fn ($s) => $this->formatStudentItem($s)),
            'meta' => [
                'current_page' => $alumni->currentPage(),
                'last_page' => $alumni->lastPage(),
                'per_page' => $alumni->perPage(),
                'total' => $alumni->total(),
            ],
        ]);
    }

    public function storeAlumni(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationFromUser();
        abort_unless($organization, 403);

        $validated = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $student = Student::query()
            ->where('organization_id', $organization->id)
            ->where('id', $validated['student_id'])
            ->firstOrFail();

        $student->update(['status' => 'alumni']);

        return response()->json(['success' => true, 'message' => 'Student moved to alumni successfully']);
    }

    public function getDashboard(): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404, 'Student record not found.');

        $classRecord = $student->schoolClass;
        $classId = $classRecord?->id;

        $attendanceRecords = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->when($classId, fn ($q) => $q->where('class_id', $classId))
            ->get();
        $attendancePresent = $attendanceRecords->whereIn('status', ['present', 'late'])->count();
        $attendanceTotal = $attendanceRecords->count();
        $attendanceAbsent = $attendanceRecords->where('status', 'absent')->count();
        $attendanceLate = $attendanceRecords->where('status', 'late')->count();
        $attendancePercentage = $attendanceTotal > 0
            ? number_format(($attendancePresent / $attendanceTotal) * 100, 2)
            : '0.00';

        $activeAcademicYearId = null;
        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->when($activeAcademicYearId, fn ($q) => $q->where('academic_year_id', $activeAcademicYearId))
            ->get();
        $pendingFees = (float) $studentFees->sum('balance');
        $paidFees = (float) $studentFees->sum('paid_amount');

        $homeworkItems = Homework::query()
            ->where('organization_id', $organization->id)
            ->when($classId, fn ($q) => $q->where('class_id', $classId))
            ->with(['subject:id,name,name_mr,name_hi', 'teacher:id,name'])
            ->orderBy('due_date')
            ->limit(6)
            ->get();
        $submittedHomeworkIds = HomeworkSubmission::query()
            ->where('student_id', $student->id)
            ->pluck('homework_id')
            ->all();
        $pendingHomeworkCount = $homeworkItems->filter(fn ($hw) => ! in_array($hw->id, $submittedHomeworkIds, true))->count();

        $upcomingExams = OnlineExam::query()
            ->where('organization_id', $organization->id)
            ->where('class_name', $classRecord?->name)
            ->where('section', $classRecord?->section)
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

        $certificateCount = IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->count();

        $unreadMessages = MessageRecipient::query()
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->count();

        $offlineExamGroups = $this->getStudentOfflineExamGroups($organization->id, $classRecord?->name, $classRecord?->section, $student->id);

        return response()->json([
            'success' => true,
            'data' => [
                'student' => [
                    'id' => $student->id,
                    'name' => trim($student->first_name . ' ' . ($student->last_name ?? '')),
                    'admission_no' => $student->admission_no,
                    'roll_number' => $student->roll_number,
                    'class' => $classRecord?->name ?? '',
                    'section' => $classRecord?->section ?? '',
                    'email' => $user->email,
                    'phone' => $user->phone,
                ],
                'attendance' => [
                    'present' => $attendancePresent,
                    'total' => $attendanceTotal,
                    'absent' => $attendanceAbsent,
                    'late' => $attendanceLate,
                    'percentage' => $attendancePercentage,
                ],
                'fees' => [
                    'pending' => $pendingFees,
                    'paid' => $paidFees,
                    'pending_count' => $studentFees->filter(fn ($f) => (float) $f->balance > 0)->count(),
                ],
                'homework' => [
                    'pending_count' => $pendingHomeworkCount,
                    'items' => $homeworkItems->map(fn ($hw) => [
                        'id' => $hw->id,
                        'title' => $hw->title,
                        'subject' => $hw->subject?->localized('name') ?? 'Subject',
                        'teacher' => $hw->teacher?->name ?? 'Teacher',
                        'due_date' => $hw->due_date?->format('Y-m-d') ?? 'N/A',
                        'status' => in_array($hw->id, $submittedHomeworkIds, true) ? 'submitted' : 'pending',
                    ])->all(),
                ],
                'exams' => [
                    'upcoming' => $upcomingExams->map(fn ($exam) => [
                        'id' => $exam->id,
                        'title' => $exam->localized('title'),
                        'subject' => $exam->localized('subject') ?? '',
                        'start_time' => $exam->start_time?->format('Y-m-d h:i A') ?? 'TBA',
                        'end_time' => $exam->end_time?->format('Y-m-d h:i A') ?? 'TBA',
                        'duration' => $exam->duration,
                    ])->all(),
                ],
                'offline_exams' => $offlineExamGroups,
                'library' => [
                    'issued' => $libraryItems->count(),
                    'overdue' => $libraryItems->where('status', 'overdue')->count(),
                    'items' => $libraryItems->map(fn ($c) => [
                        'id' => $c->id,
                        'title' => $c->book?->title ?? 'Book',
                        'due_date' => $c->due_date?->format('Y-m-d') ?? 'N/A',
                        'status' => $c->status,
                    ])->all(),
                ],
                'certificates' => $certificateCount,
                'unread_messages' => $unreadMessages,
            ],
        ]);
    }

    public function getAttendance(Request $request): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        $month = $request->input('month', now()->format('m'));
        $year = $request->input('year', now()->format('Y'));

        $query = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->orderBy('date');

        $records = $query->get()->map(fn ($r) => [
            'id' => $r->id,
            'date' => $r->date->format('Y-m-d'),
            'status' => $r->status,
            'remark' => $r->remark,
        ]);

        $present = $records->whereIn('status', ['present', 'late'])->count();
        $total = $records->count();

        return response()->json([
            'success' => true,
            'data' => [
                'records' => $records,
                'present' => $present,
                'total' => $total,
                'absent' => $records->where('status', 'absent')->count(),
                'late' => $records->where('status', 'late')->count(),
                'percentage' => $total > 0 ? number_format(($present / $total) * 100, 2) : '0.00',
                'month' => $month,
                'year' => $year,
            ],
        ]);
    }

    public function getExamResults(): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        $classRecord = $student->schoolClass;
        $className = $classRecord?->name;
        $section = $classRecord?->section;

        // `exams` has no class_name/section column; the class lives on
        // exam_schedules via class_id. Filter through that relation.
        $examGroups = Exam::query()
            ->where('organization_id', $organization->id)
            ->where('publish_status', 'published')
            ->whereHas('schedules', function ($q) use ($className, $section) {
                $q->whereHas('schoolClass', function ($cq) use ($className, $section) {
                    $cq->where('name', $className)->where('section', $section);
                });
            })
            ->with(['schedules' => fn ($q) => $q->orderBy('exam_date')])
            ->orderByDesc('created_at')
            ->get();

        $resultGroups = [];
        foreach ($examGroups as $exam) {
            $schedules = $exam->schedules;
            $results = [];
            $totalMarks = 0;
            $obtainedMarks = 0;
            $hasResults = false;

            foreach ($schedules as $schedule) {
                $result = ExamResult::query()
                    ->where('exam_schedule_id', $schedule->id)
                    ->where('student_id', $student->id)
                    ->first();

                if ($result) {
                    $hasResults = true;
                    $marksObtained = (float) ($result->marks_obtained ?? 0);
                    $totalMarksForSubject = (float) ($schedule->total_marks ?? 0);
                    $passingMarks = (float) ($schedule->passing_marks ?? 0);
                    $totalMarks += $totalMarksForSubject;
                    $obtainedMarks += $marksObtained;

                    $results[] = [
                        'schedule_id' => $schedule->id,
                        'subject' => $schedule->subject,
                        'exam_date' => $schedule->exam_date?->format('Y-m-d'),
                        'start_time' => $schedule->start_time,
                        'end_time' => $schedule->end_time,
                        'room_number' => $schedule->room_number,
                        'total_marks' => $totalMarksForSubject,
                        'passing_marks' => $passingMarks,
                        'marks_obtained' => $marksObtained,
                        'grade' => $result->grade,
                        'status' => $marksObtained >= $passingMarks ? 'passed' : 'failed',
                    ];
                }
            }

            $percentage = $totalMarks > 0 ? round(($obtainedMarks / $totalMarks) * 100, 2) : null;

            $resultGroups[] = [
                'exam_id' => $exam->id,
                'name' => $exam->localized('name'),
                'publish_status' => $exam->publish_status,
                'has_results' => $hasResults,
                'total_marks' => $totalMarks,
                'obtained_marks' => $obtainedMarks,
                'percentage' => $percentage,
                'results' => $results,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $resultGroups,
            'student' => [
                'name' => trim($student->first_name . ' ' . ($student->last_name ?? '')),
                'admission_no' => $student->admission_no,
                'class' => $className,
                'section' => $section,
            ],
        ]);
    }

    public function getStudentOfflineExams(): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        $classRecord = $student->schoolClass;

        $groups = $this->getStudentOfflineExamGroups($organization->id, $classRecord?->name, $classRecord?->section, $student->id);

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    public function getProfile(): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $student->id,
                'user_id' => $user->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'gender' => $student->gender,
                'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
                'blood_group' => $student->blood_group,
                'admission_no' => $student->admission_no,
                'roll_number' => $student->roll_number,
                'admission_date' => $student->admission_date?->format('Y-m-d'),
                'category' => $student->category,
                'religion' => $student->religion,
                'caste' => $student->caste,
                'address' => $student->address,
                'city' => $student->city,
                'state' => $student->state,
                'pincode' => $student->pincode,
                'father_name' => $student->father_name,
                'father_phone' => $student->father_phone,
                'father_occupation' => $student->father_occupation,
                'mother_name' => $student->mother_name,
                'mother_phone' => $student->mother_phone,
                'mother_occupation' => $student->mother_occupation,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'student', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = $this->resolveStudentForUser($user, $organization);
        abort_unless($student, 404);

        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:10'],
            'blood_group' => ['nullable', 'string', 'max:10'],
        ]);

        DB::transaction(function () use ($user, $student, $validated) {
            if (isset($validated['phone'])) {
                $user->update(['phone' => $validated['phone']]);
            }
            $student->update([
                'address' => $validated['address'] ?? $student->address,
                'city' => $validated['city'] ?? $student->city,
                'state' => $validated['state'] ?? $student->state,
                'pincode' => $validated['pincode'] ?? $student->pincode,
                'blood_group' => $validated['blood_group'] ?? $student->blood_group,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
        ]);
    }

    private function getStudentOfflineExamGroups(int $organizationId, ?string $className, ?string $section, int $studentId): array
    {
        // `exams` has no class_name/section column: ExamApiController stores the
        // class in the JSON description. Filter through the schedules' class id
        // instead of querying columns that do not exist.
        $exams = Exam::query()
            ->where('organization_id', $organizationId)
            ->whereHas('schedules', function ($q) use ($className, $section) {
                $q->whereHas('schoolClass', function ($cq) use ($className, $section) {
                    $cq->where('name', $className)->where('section', $section);
                });
            })
            ->with(['schedules' => function ($q) {
                $q->orderBy('exam_date');
            }])
            ->orderByDesc('created_at')
            ->get();

        return $exams->map(function ($exam) use ($studentId) {
            $schedules = $exam->schedules->map(function ($schedule) use ($studentId) {
                $result = ExamResult::query()
                    ->where('exam_schedule_id', $schedule->id)
                    ->where('student_id', $studentId)
                    ->first();

                return [
                    'id' => $schedule->id,
                    'subject' => $schedule->subject,
                    'exam_date' => $schedule->exam_date?->format('Y-m-d'),
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'room_number' => $schedule->room_number,
                    'total_marks' => (float) $schedule->total_marks,
                    'passing_marks' => (float) $schedule->passing_marks,
                    'has_result' => $result !== null,
                    'marks_obtained' => $result ? (float) $result->marks_obtained : null,
                    'grade' => $result?->grade,
                    'status' => $result ? ((float) $result->marks_obtained >= (float) $schedule->passing_marks ? 'passed' : 'failed') : 'pending',
                ];
            })->all();

            $publishedResults = collect($schedules)->filter(fn ($s) => $s['has_result'])->count();

            return [
                'exam_id' => $exam->id,
                'name' => $exam->localized('name'),
                'publish_status' => $exam->publish_status,
                'class' => $exam->class_name,
                'section' => $exam->section,
                'subjects_count' => count($schedules),
                'published_results_count' => $publishedResults,
                'schedules' => $schedules,
            ];
        })->all();
    }

    private function formatStudentItem(Student $student): array
    {
        $lang = $this->resolvedLocale();

        return [
            'id' => $student->id,
            'name' => trim($student->first_name . ' ' . ($student->last_name ?? '')),
            'name_localized' => trim($student->localized('first_name', $lang) . ' ' . $student->localized('last_name', $lang)),
            'first_name' => $student->first_name,
            'first_name_mr' => $student->first_name_mr,
            'last_name' => $student->last_name,
            'last_name_mr' => $student->last_name_mr,
            'father_name' => $student->father_name,
            'father_name_mr' => $student->father_name_mr,
            'mother_name' => $student->mother_name,
            'mother_name_mr' => $student->mother_name_mr,
            'address_mr' => $student->address_mr,
            'city_mr' => $student->city_mr,
            'state_mr' => $student->state_mr,
            'admission_no' => $student->admission_no,
            'roll_number' => $student->roll_number,
            'email' => $student->email,
            'phone' => $student->phone ?? '',
            'gender' => $student->gender,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'blood_group' => $student->blood_group,
            'admission_date' => $student->admission_date?->format('Y-m-d'),
            'class' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->section,
            'category' => $student->category,
            'city' => $student->city,
            'state' => $student->state,
            'status' => $student->status ?? 'active',
            'created_at' => $student->created_at?->toISOString(),
        ];
    }

    private function resolvedLocale(): ?string
    {
        $resolved = request()->attributes->get('locale');

        if (is_string($resolved) && LanguageCatalog::isValidCode($resolved)) {
            return $resolved;
        }

        $query = request()->query('lang');

        return is_string($query) && LanguageCatalog::isValidCode($query) ? $query : null;
    }

    private function resolveOrganizationFromUser(): ?Organization
    {
        $user = Auth::user();
        if ($user->organization_id) {
            return Organization::find($user->organization_id);
        }
        return Organization::count() === 1 ? Organization::first() : null;
    }

    private function resolveStudentForUser(User $user, Organization $organization): ?Student
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            })
            ->with('schoolClass:id,name,section')
            ->first();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::find($user->organization_id);
        }
        return Organization::count() === 1 ? Organization::first() : null;
    }
}
