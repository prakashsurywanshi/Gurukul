<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Organization;
use App\Models\QrScanLog;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\StudentAcademicHistoryService;
use App\Support\QrToken;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceApiController extends Controller
{
    private const QR_SETTINGS_DEFAULTS = [
        'enabled' => true,
        'duplicate_upsert' => false,
        'auto_late_mark' => false,
        'opening_time' => '08:30',
        'late_after_minutes' => 15,
    ];

    public function __construct(private readonly StudentAcademicHistoryService $studentAcademicHistoryService)
    {
    }

    public function indexClasses(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        $classes = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->when(
                $user->role === 'teacher',
                fn ($query) => $query->where('class_teacher_id', $user->id)
            )
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);

        $classWithCounts = $classes->map(function ($class) use ($organization, $activeAcademicYearId) {
            $studentCount = $this->studentAcademicHistoryService
                ->getSessionEnrollmentQuery($organization->id, $activeAcademicYearId)
                ->where('class_id', $class->id)
                ->count();

            return [
                'id' => $class->id,
                'name' => $class->name,
                'section' => $class->section,
                'student_count' => $studentCount,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $classWithCounts,
        ]);
    }

    public function indexStudents(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $request->validate([
            'class_id' => 'required|exists:classes,id',
            'date' => 'required|date',
        ]);

        $classId = (int) $request->input('class_id');
        $date = $request->input('date');

        $this->ensureTeacherCanAccessClass($user, $organization, $classId);

        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        $enrollments = $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId)
            ->where('class_id', $classId)
            ->filter(fn ($history) => ($history->status ?? $history->student?->status) === 'active')
            ->map(function ($history) {
                $student = $history->student;
                if (!$student) return null;

                return [
                    'id' => (string) $student->id,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'roll_number' => $history->roll_number ?: $student->roll_number,
                    'gender' => $student->gender,
                ];
            })
            ->filter()
            ->values();

        $attendanceRecords = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $classId)
            ->where('date', $date)
            ->get()
            ->map(function (Attendance $attendance) {
                return [
                    'student_id' => (string) $attendance->student_id,
                    'status' => $attendance->status,
                ];
            })
            ->keyBy('student_id');

        return response()->json([
            'success' => true,
            'students' => $enrollments,
            'attendance' => $attendanceRecords,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $validated = $request->validate([
            'class_id' => [
                'required',
                Rule::exists('classes', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.student_id' => [
                'required',
                Rule::exists('students', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'entries.*.status' => ['required', Rule::in(['present', 'absent', 'late', 'half_day'])],
        ]);

        $this->ensureTeacherCanAccessClass($user, $organization, (int) $validated['class_id']);

        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        $students = $this->studentAcademicHistoryService
            ->getSessionEnrollmentQuery($organization->id, $activeAcademicYearId)
            ->where('class_id', $validated['class_id'])
            ->whereIn('student_id', collect($validated['entries'])->pluck('student_id'))
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($students) !== count($validated['entries'])) {
            return response()->json(['success' => false, 'message' => 'One or more students do not belong to the selected class.'], 422);
        }

        $saved = 0;
        foreach ($validated['entries'] as $entry) {
            Attendance::query()->updateOrCreate(
                [
                    'student_id' => $entry['student_id'],
                    'date' => $validated['date'],
                ],
                [
                    'organization_id' => $organization->id,
                    'class_id' => $validated['class_id'],
                    'status' => $entry['status'],
                    'marked_by' => $user->id,
                ]
            );
            $saved++;
        }

        return response()->json([
            'success' => true,
            'message' => 'Attendance saved successfully.',
            'saved' => $saved,
        ]);
    }

    public function indexRecords(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $request->validate([
            'class_id' => 'nullable|exists:classes,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $query = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereHas('schoolClass', fn ($classQuery) => $classQuery->forCurrentSession($organization->id))
            ->when(
                $user->role === 'teacher',
                fn ($attendanceQuery) => $attendanceQuery->whereIn('class_id', $this->allowedClassIds($organization, $user))
            )
            ->orderByDesc('date');

        if ($request->filled('class_id')) {
            $this->ensureTeacherCanAccessClass($user, $organization, (int) $request->input('class_id'));
            $query->where('class_id', $request->input('class_id'));
        }

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->input('date_to'));
        }

        $records = $query->limit(500)->get()->map(function (Attendance $attendance) {
            return [
                'id' => $attendance->id,
                'student_id' => (string) $attendance->student_id,
                'class_id' => $attendance->class_id,
                'date' => optional($attendance->date)->format('Y-m-d'),
                'status' => $attendance->status,
                'marked_by' => $attendance->markedBy?->name,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    public function qrStudents(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $validated = $request->validate([
            'class_id' => [
                'required',
                Rule::exists('classes', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'date' => ['nullable', 'date'],
        ]);

        $classId = (int) $validated['class_id'];
        $date = $validated['date'] ?? now()->toDateString();

        $this->ensureTeacherCanAccessClass($user, $organization, $classId);

        $students = Student::query()
            ->forCurrentSession($organization->id)
            ->where('class_id', $classId)
            ->where('status', 'active')
            ->orderBy('roll_number')
            ->get();

        foreach ($students as $student) {
            if (! $student->qr_token) {
                $student->qr_token = QrToken::generate('QR', (int) $organization->id, (int) $student->id);
                $student->save();
            }
        }

        $attendanceRecords = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $classId)
            ->whereDate('date', $date)
            ->get()
            ->keyBy('student_id');

        $roster = $students->map(function (Student $student) use ($attendanceRecords) {
            $attendance = $attendanceRecords->get($student->id);

            return [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'roll_number' => $student->roll_number,
                'qr_token' => $student->qr_token,
                'status' => $attendance?->status,
                'check_in_time' => $attendance?->check_in_time,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'class_id' => (string) $classId,
                'date' => $date,
                'settings' => $this->qrAttendanceSettings($organization),
                'students' => $roster,
            ],
        ]);
    }

    public function qrStore(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $validated = $request->validate([
            'class_id' => [
                'required',
                Rule::exists('classes', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.student_id' => [
                'required',
                Rule::exists('students', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'entries.*.status' => ['required', Rule::in(['present', 'absent', 'late', 'half_day'])],
        ]);

        $classId = (int) $validated['class_id'];
        $this->ensureTeacherCanAccessClass($user, $organization, $classId);

        $class = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->whereKey($classId)
            ->first();

        if (! $class) {
            return response()->json(['success' => false, 'message' => 'Invalid class for the current session.'], 422);
        }

        $studentIds = collect($validated['entries'])->pluck('student_id')->all();

        $enrolledStudentIds = Student::query()
            ->forCurrentSession($organization->id)
            ->where('class_id', $classId)
            ->whereIn('id', $studentIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($enrolledStudentIds) !== count($studentIds)) {
            return response()->json(['success' => false, 'message' => 'One or more students do not belong to the selected class.'], 422);
        }

        $qrTokens = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $studentIds)
            ->pluck('qr_token', 'id');

        $settings = $this->qrAttendanceSettings($organization);
        $saved = 0;

        foreach ($validated['entries'] as $entry) {
            $studentId = (int) $entry['student_id'];
            $status = $entry['status'];

            if ($status === 'present' && $settings['auto_late_mark'] && $validated['date'] === now()->toDateString()) {
                $lateAfter = Carbon::createFromFormat('H:i', $settings['opening_time'])
                    ->addMinutes((int) $settings['late_after_minutes']);
                $currentTime = Carbon::createFromFormat('H:i', now()->format('H:i'));

                if ($currentTime->greaterThanOrEqualTo($lateAfter)) {
                    $status = 'late';
                }
            }

            $existing = Attendance::query()
                ->where('organization_id', $organization->id)
                ->where('student_id', $studentId)
                ->where('class_id', $classId)
                ->whereDate('date', $validated['date'])
                ->first();

            if ($existing) {
                if (! $settings['duplicate_upsert']) {
                    continue;
                }

                $existing->update([
                    'status' => $status,
                    'check_in_time' => $status === 'present' ? now()->format('H:i:s') : null,
                    'marked_by' => $user->id,
                ]);
            } else {
                Attendance::query()->create([
                    'organization_id' => $organization->id,
                    'student_id' => $studentId,
                    'class_id' => $classId,
                    'date' => $validated['date'],
                    'status' => $status,
                    'check_in_time' => $status === 'present' ? now()->format('H:i:s') : null,
                    'marked_by' => $user->id,
                ]);
            }

            QrScanLog::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $studentId,
                'scanned_by' => $user->id,
                'method' => 'qr',
                'status' => in_array($status, ['present', 'late'], true) ? 'success' : 'failure',
                'qr_token' => $qrTokens[$studentId] ?? null,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'scan_date' => $validated['date'],
            ]);

            $saved++;
        }

        return response()->json([
            'success' => true,
            'message' => 'Attendance saved successfully.',
            'saved' => $saved,
        ]);
    }

    public function qrSettings()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'settings' => $this->qrAttendanceSettings($organization),
            ],
        ]);
    }

    public function qrSaveSettings(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $validated = $request->validate([
            'enabled' => ['boolean'],
            'duplicate_upsert' => ['boolean'],
            'auto_late_mark' => ['boolean'],
            'opening_time' => ['required', 'date_format:H:i'],
            'late_after_minutes' => ['required', 'integer', 'between:0,180'],
        ]);

        $settings = $organization->settings ?? [];
        $settings['qr_attendance'] = [
            'enabled' => (bool) ($validated['enabled'] ?? false),
            'duplicate_upsert' => (bool) ($validated['duplicate_upsert'] ?? false),
            'auto_late_mark' => (bool) ($validated['auto_late_mark'] ?? false),
            'opening_time' => $validated['opening_time'],
            'late_after_minutes' => (int) $validated['late_after_minutes'],
        ];

        $organization->settings = $settings;
        $organization->save();

        return response()->json([
            'success' => true,
            'message' => 'QR attendance settings saved.',
            'data' => [
                'settings' => $settings['qr_attendance'],
            ],
        ]);
    }

    private function qrAttendanceSettings(Organization $organization): array
    {
        $saved = is_array($organization->settings['qr_attendance'] ?? null)
            ? $organization->settings['qr_attendance']
            : [];

        return array_merge(self::QR_SETTINGS_DEFAULTS, $saved);
    }

    private function allowedClassIds(Organization $organization, $user): array
    {
        if ($user->role !== 'teacher') {
            return [];
        }

        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('class_teacher_id', $user->id)
            ->pluck('id')
            ->all();
    }

    private function ensureTeacherCanAccessClass($user, Organization $organization, int $classId): void
    {
        if ($user->role !== 'teacher') {
            return;
        }

        $isAllowed = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->whereKey($classId)
            ->where('class_teacher_id', $user->id)
            ->exists();

        if (! $isAllowed) {
            throw new HttpException(403, 'You can only manage attendance for your own classes.');
        }
    }

    private function resolveOrganizationForUser($user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

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
