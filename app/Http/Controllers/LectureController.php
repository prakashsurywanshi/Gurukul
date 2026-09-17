<?php

namespace App\Http\Controllers;

use App\Models\Lecture;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\User;
use App\Services\OrgTypePolicy;
use App\Services\StaffPermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LectureController extends Controller
{
    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly OrgTypePolicy $orgTypePolicy
    ) {
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->abortUnlessCollegeMode($organization);

        $classId = $request->integer('class_id') ?: null;

        $classes = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->orderBy('name')
            ->get(['id', 'name', 'section']);

        if ($classId) {
            $class = $classes->firstWhere('id', $classId) ?: null;

            if (! $class) {
                abort(404);
            }
        } else {
            $class = $classes->first();
        }

        $semester = $organization->currentSemester();

        $lectures = $class
            ? Lecture::query()
                ->where('organization_id', $organization->id)
                ->where('class_id', $class->id)
                ->with(['subject:id,name,code', 'teacher:id,name'])
                ->get()
                ->map(fn (Lecture $lecture) => $this->lecturePayload($lecture))
            : [];

        return Inertia::render('dashboard/college/LectureTimetable', [
            'user' => $user,
            'classes' => $classes,
            'selectedClassId' => $class?->id,
            'selectedClassName' => $class ? trim(($class->name ?? '').' '.($class->section ?? '')) : null,
            'lectures' => $lectures,
            'subjects' => Subject::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name', 'code']),
            'teachers' => $this->teacherOptions($organization),
            'semester' => $semester ? [
                'id' => $semester->id,
                'name' => $semester->name,
                'sem_no' => $semester->sem_no,
            ] : null,
            'daysOfWeek' => collect(range(0, 6))->map(fn (int $day) => [
                'value' => $day,
                'label' => now()->startOfWeek()->addDays($day)->format('l'),
            ])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate($this->rules($organization));

        $this->assertNoOverlap($organization, $validated);

        Lecture::create([
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'] ?? null,
            'teacher_id' => $validated['teacher_id'] ?? null,
            'semester_id' => $validated['semester_id'] ?? null,
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'room' => $validated['room'] ?? null,
        ]);

        return redirect()->route('college.lectures.index', ['class_id' => $validated['class_id']])
            ->with('success', 'Lecture scheduled.');
    }

    public function update(Request $request, Lecture $lecture): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $lecture->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate($this->rules($organization, $lecture->id));

        $this->assertNoOverlap($organization, $validated, $lecture->id);

        $lecture->update([
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'] ?? null,
            'teacher_id' => $validated['teacher_id'] ?? null,
            'semester_id' => $validated['semester_id'] ?? null,
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'room' => $validated['room'] ?? null,
        ]);

        return redirect()->route('college.lectures.index', ['class_id' => $validated['class_id']])
            ->with('success', 'Lecture updated.');
    }

    public function destroy(Lecture $lecture, Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $lecture->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $classId = $lecture->class_id;
        $lecture->delete();

        return redirect()->route('college.lectures.index', ['class_id' => $classId])
            ->with('success', 'Lecture removed.');
    }

    private function rules(Organization $organization, ?int $ignoreId = null): array
    {
        return [
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'integer', 'exists:users,id'],
            'semester_id' => ['nullable', 'integer', 'exists:semesters,id'],
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string', 'max:80'],
        ];
    }

    private function assertNoOverlap(Organization $organization, array $validated, ?int $ignoreId = null): void
    {
        $overlap = Lecture::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $validated['class_id'])
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->whereRaw('(start_time < ? AND end_time > ?)', [$validated['end_time'], $validated['start_time']])
            ->exists();

        if ($overlap) {
            abort(422, 'This time slot overlaps with an existing lecture for the selected class.');
        }
    }

    private function lecturePayload(Lecture $lecture): array
    {
        return [
            'id' => $lecture->id,
            'class_id' => $lecture->class_id,
            'subject_id' => $lecture->subject_id,
            'subject_name' => $lecture->subject?->name,
            'subject_code' => $lecture->subject?->code,
            'teacher_id' => $lecture->teacher_id,
            'teacher_name' => $lecture->teacher?->name,
            'semester_id' => $lecture->semester_id,
            'day_of_week' => $lecture->day_of_week,
            'start_time' => substr($lecture->start_time, 0, 5),
            'end_time' => substr($lecture->end_time, 0, 5),
            'room' => $lecture->room,
        ];
    }

    private function teacherOptions(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->all();
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (!$user) {
            return null;
        }

        return $this->staffPermissionService->resolveOrganizationForUser($user);
    }

    private function abortUnlessCollegeMode(Organization $organization): void
    {
        $this->orgTypePolicy->assertSupportsCourses($organization);
    }
}