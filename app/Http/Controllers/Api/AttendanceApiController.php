<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceApiController extends Controller
{
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
