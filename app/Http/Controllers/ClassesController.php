<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LessonPlan;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class ClassesController extends Controller
{
    public function index() {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/ClassManagement', [
            'user' => $user,
            'classRecords' => $organization ? $this->getClassRecords($organization->id) : [],
            'sectionRecords' => $organization ? $this->getSectionRecords($organization) : [],
            'teacherRecords' => $organization ? $this->getTeacherRecords($organization->id) : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $academicYearId = $this->getActiveAcademicYearId($organization->id);

        if (!$academicYearId) {
            return redirect()->route('classes')->with('error', 'Create and activate an academic session first.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'section' => ['required', 'string', 'max:50'],
            'teacher_id' => ['nullable', Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'room_number' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'name' => $validated['name'],
            'section' => $validated['section'],
            'class_teacher_id' => $validated['teacher_id'] ?: null,
            'room_number' => $validated['room_number'] ?? null,
            'capacity' => $validated['capacity'] ?? 30,
            'status' => 'active',
        ]);

        $this->syncSectionSettings($organization, $validated['section']);

        return redirect()->route('classes')->with('success', 'Class created successfully.');
    }

    public function update(Request $request, SchoolClass $schoolClass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $schoolClass->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'section' => ['required', 'string', 'max:50'],
            'teacher_id' => ['nullable', Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'room_number' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $attributes = [
            'name' => $validated['name'],
            'section' => $validated['section'],
            'class_teacher_id' => $validated['teacher_id'] ?: null,
            'room_number' => $validated['room_number'] ?? null,
        ];

        if (array_key_exists('capacity', $validated)) {
            $attributes['capacity'] = $validated['capacity'] ?? 30;
        }

        $schoolClass->update($attributes);

        $this->syncSectionSettings($organization, $validated['section']);

        return redirect()->route('classes')->with('success', 'Class updated successfully.');
    }

    public function destroy(SchoolClass $schoolClass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $schoolClass->organization_id === $organization->id, 403);

        $schoolClass->delete();

        $this->syncSectionSettings($organization);

        return redirect()->route('classes')->with('success', 'Class deleted successfully.');
    }

    public function storeSection(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        $this->syncSectionSettings($organization, $validated['name']);

        return redirect()->route('classes')->with('success', 'Section created successfully.');
    }

    public function updateSection(Request $request, string $section): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('section', $section)
            ->update(['section' => $validated['name']]);

        $existingSections = collect($organization->settings['sections'] ?? [])
            ->map(fn ($item) => $item === $section ? $validated['name'] : $item)
            ->push($validated['name'])
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'sections' => $existingSections,
            ],
        ]);

        return redirect()->route('classes')->with('success', 'Section updated successfully.');
    }

    public function destroySection(string $section): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $linkedClasses = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('section', $section)
            ->count();

        if ($linkedClasses > 0) {
            return redirect()->route('classes')->with('error', "Section {$section} is linked to existing classes.");
        }

        $existingSections = collect($organization->settings['sections'] ?? [])
            ->reject(fn ($item) => $item === $section)
            ->values()
            ->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'sections' => $existingSections,
            ],
        ]);

        return redirect()->route('classes')->with('success', 'Section deleted successfully.');
    }

    public function classTimeTable()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/ClassTimeTable', [
            'user' => $user,
            'classes' => $organization ? $this->getClassRecords($organization->id) : [],
            'teachers' => $organization ? $this->getTeacherRecords($organization->id) : [],
            'subjects' => $organization ? $this->getSubjectRecords($organization->id) : [],
            'entries' => $organization ? $this->getTimetableEntries($organization->id) : [],
            'studentRecord' => $organization && $user->role === 'student'
                ? $this->resolveStudentForUser($user, $organization)
                : null,
        ]);
    }

    public function storeTimeTableEntry(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $this->abortUnlessCanManageTimetables($user);
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $this->validateTimetablePayload($request, $organization, null);

        Timetable::query()->create([
            ...$validated,
            'organization_id' => $organization->id,
        ]);

        return redirect()->route('class-time-table')->with('success', 'Timetable entry created successfully.');
    }

    public function updateTimeTableEntry(Request $request, Timetable $timetable): RedirectResponse
    {
        $user = Auth::user();
        $this->abortUnlessCanManageTimetables($user);
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $timetable->organization_id === $organization->id, 403);

        $validated = $this->validateTimetablePayload($request, $organization, $timetable);

        $timetable->update($validated);

        return redirect()->route('class-time-table')->with('success', 'Timetable entry updated successfully.');
    }

    public function destroyTimeTableEntry(Timetable $timetable): RedirectResponse
    {
        $user = Auth::user();
        $this->abortUnlessCanManageTimetables($user);
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $timetable->organization_id === $organization->id, 403);

        $timetable->delete();

        return redirect()->route('class-time-table')->with('success', 'Timetable entry deleted successfully.');
    }

    public function teacherTimeTable()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $teacherId = $user->role === 'teacher' ? $user->id : null;

        return inertia('dashboard/TeacherTimeTable', [
            'user' => $user,
            'classes' => $organization ? $this->getClassRecords($organization->id) : [],
            'teachers' => $organization ? $this->getTeacherRecords($organization->id, $teacherId) : [],
            'subjects' => $organization ? $this->getSubjectRecords($organization->id) : [],
            'entries' => $organization ? $this->getTimetableEntries($organization->id, $teacherId) : [],
        ]);
    }

    public function lessonPlan()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $teacherId = $user->role === 'teacher' ? $user->id : null;

        return inertia('dashboard/LessonPlanManagement', [
            'user' => $user,
            'classes' => $organization ? $this->getClassRecords($organization->id) : [],
            'teachers' => $organization ? $this->getTeacherRecords($organization->id, $teacherId) : [],
            'entries' => $organization ? $this->getTimetableEntries($organization->id, $teacherId) : [],
            'lessonPlans' => $organization ? $this->getLessonPlanEntries($organization->id, $teacherId) : [],
            'studentRecord' => $organization && $user->role === 'student'
                ? $this->resolveStudentForLessonPlan($user, $organization)
                : null,
        ]);
    }

    public function storeLessonPlan(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $this->validateLessonPlanPayload($request, $organization);

        $timetable = Timetable::query()
            ->where('organization_id', $organization->id)
            ->with(['schoolClass:id,name,section', 'subject:id,name,name_mr,name_hi', 'teacher:id,name'])
            ->findOrFail((int) $validated['timetableEntryId']);
        $this->abortUnlessCanManageLessonPlanForTimetable($user, $timetable);

        LessonPlan::query()->create([
            'organization_id' => $organization->id,
            'timetable_id' => $timetable->id,
            'class_id' => $timetable->class_id,
            'subject_id' => $timetable->subject_id,
            'teacher_id' => $timetable->teacher_id,
            'lesson_date' => $validated['lessonDate'],
            'lesson_title' => $validated['lessonTitle'],
            'topic' => $validated['topic'],
            'status' => $validated['status'],
            'remarks' => null,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return redirect()->route('lesson-plan')->with('success', 'Lesson plan created successfully.');
    }

    public function updateLessonPlan(Request $request, LessonPlan $lessonPlan): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $lessonPlan->organization_id === $organization->id, 403);
        $this->abortUnlessCanManageLessonPlanRecord($user, $lessonPlan);

        $validated = $this->validateLessonPlanPayload($request, $organization);

        $timetable = Timetable::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['timetableEntryId']);
        $this->abortUnlessCanManageLessonPlanForTimetable($user, $timetable);

        $lessonPlan->update([
            'timetable_id' => $timetable->id,
            'class_id' => $timetable->class_id,
            'subject_id' => $timetable->subject_id,
            'teacher_id' => $timetable->teacher_id,
            'lesson_date' => $validated['lessonDate'],
            'lesson_title' => $validated['lessonTitle'],
            'topic' => $validated['topic'],
            'status' => $validated['status'],
            'updated_by' => $user->id,
        ]);

        return redirect()->route('lesson-plan')->with('success', 'Lesson plan updated successfully.');
    }

    public function destroyLessonPlan(LessonPlan $lessonPlan): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $lessonPlan->organization_id === $organization->id, 403);
        $this->abortUnlessCanManageLessonPlanRecord($user, $lessonPlan);

        $lessonPlan->delete();

        return redirect()->route('lesson-plan')->with('success', 'Lesson plan deleted successfully.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query
                        ->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
                ->value('organization_id');

            if ($studentOrganizationId) {
                $user->forceFill(['organization_id' => $studentOrganizationId])->save();
                $user->organization_id = $studentOrganizationId;

                return Organization::query()->find($studentOrganizationId);
            }
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

    private function getActiveAcademicYearId(int $organizationId): ?int
    {
        $organization = Organization::query()->find($organizationId);

        return $organization?->selectedAcademicYear()?->id;
    }

    private function getClassRecords(int $organizationId): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organizationId)
            ->with('teacher:id,name')
            ->withCount([
                'studentAcademicHistories as student_count' => fn ($query) => $query
                    ->where('is_current', true)
                    ->where('status', 'active')
                    ->whereHas('student', fn ($studentQuery) => $studentQuery->where('status', 'active')),
            ])
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
                'teacher_id' => $schoolClass->class_teacher_id ? (string) $schoolClass->class_teacher_id : null,
                'teacher_name' => $schoolClass->teacher?->name,
                'room_number' => $schoolClass->room_number,
                'capacity' => $schoolClass->capacity,
                'student_count' => (int) $schoolClass->student_count,
                'status' => $schoolClass->status,
            ])
            ->all();
    }

    private function getTeacherRecords(int $organizationId, ?int $teacherId = null): array
    {
        return User::query()
            ->where('organization_id', $organizationId)
            ->where('role', 'teacher')
            ->where('status', '!=', 'inactive')
            ->when($teacherId, fn ($query) => $query->where('id', $teacherId))
            ->orderBy('name')
            ->get()
            ->map(fn (User $teacher) => [
                'id' => (string) $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'status' => $teacher->status ?? 'active',
            ])
            ->all();
    }

    private function getSubjectRecords(int $organizationId): array
    {
        return Subject::query()
            ->where('organization_id', $organizationId)
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'name' => $subject->localized('name'),
                'code' => $subject->code,
            ])
            ->all();
    }

    private function getTimetableEntries(int $organizationId, ?int $teacherId = null): array
    {
        return Timetable::query()
            ->where('organization_id', $organizationId)
            ->when($teacherId, fn ($query) => $query->where('teacher_id', $teacherId))
            ->with([
                'schoolClass:id,name,section,room_number',
                'subject:id,name,name_mr,name_hi,code',
                'teacher:id,name',
            ])
            ->orderBy('day')
            ->orderBy('period_order')
            ->orderBy('start_time')
            ->orderBy('id')
            ->get()
            ->map(fn (Timetable $entry) => [
                'id' => (string) $entry->id,
                'classId' => (string) $entry->class_id,
                'day' => ucfirst($entry->day),
                'periodId' => (string) ($entry->period_code ?: ''),
                'subject' => $entry->subject?->name ?? 'Subject',
                'subjectId' => $entry->subject_id ? (string) $entry->subject_id : '',
                'teacherId' => $entry->teacher_id ? (string) $entry->teacher_id : '',
                'teacherName' => $entry->teacher?->name ?? 'Teacher not assigned',
                'room' => $entry->room_number ?? ($entry->schoolClass?->room_number ?? 'TBD'),
                'startTime' => substr((string) $entry->start_time, 0, 5),
                'endTime' => substr((string) $entry->end_time, 0, 5),
            ])
            ->values()
            ->all();
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?array
    {
        $studentQuery = Student::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            });

        if ($organization) {
            $studentQuery->where('organization_id', $organization->id);
        }

        $student = $studentQuery->first();

        if (! $student) {
            return null;
        }

        return [
            'id' => (string) $student->id,
            'className' => (string) ($student->schoolClass?->name ?? ''),
            'section' => (string) ($student->schoolClass?->section ?? ''),
            'email' => $student->email,
        ];
    }

    private function resolveStudentForLessonPlan(User $user, ?Organization $organization): ?array
    {
        $studentQuery = Student::query()
            ->with('schoolClass:id,name,section')
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            });

        if ($organization) {
            $studentQuery->where('organization_id', $organization->id);
        }

        $student = $studentQuery->first();

        if (! $student) {
            return null;
        }

        return [
            'id' => (string) $student->id,
            'classId' => $student->class_id ? (string) $student->class_id : '',
            'className' => (string) ($student->schoolClass?->name ?? ''),
            'section' => (string) ($student->schoolClass?->section ?? ''),
            'email' => $student->email,
        ];
    }

    private function getLessonPlanEntries(int $organizationId, ?int $teacherId = null): array
    {
        return LessonPlan::query()
            ->where('organization_id', $organizationId)
            ->when($teacherId, fn ($query) => $query->where('teacher_id', $teacherId))
            ->with([
                'timetable:id,class_id,subject_id,teacher_id,day,period_code,start_time,end_time,room_number',
                'subject:id,name,name_mr,name_hi',
                'teacher:id,name',
            ])
            ->orderBy('lesson_date')
            ->orderBy('id')
            ->get()
            ->map(fn (LessonPlan $plan) => [
                'id' => (string) $plan->id,
                'timetableEntryId' => $plan->timetable_id ? (string) $plan->timetable_id : '',
                'classId' => (string) $plan->class_id,
                'day' => ucfirst((string) ($plan->timetable?->day ?? '')),
                'periodId' => (string) ($plan->timetable?->period_code ?? ''),
                'subject' => (string) ($plan->subject?->name ?? 'Subject'),
                'teacherName' => (string) ($plan->teacher?->name ?? 'Teacher'),
                'room' => (string) ($plan->timetable?->room_number ?? 'TBD'),
                'startTime' => substr((string) ($plan->timetable?->start_time ?? ''), 0, 5),
                'endTime' => substr((string) ($plan->timetable?->end_time ?? ''), 0, 5),
                'lessonDate' => optional($plan->lesson_date)->format('Y-m-d') ?? '',
                'lessonTitle' => $plan->lesson_title,
                'topic' => $plan->topic,
                'status' => $plan->status,
            ])
            ->values()
            ->all();
    }

    private function validateLessonPlanPayload(Request $request, Organization $organization): array
    {
        return $request->validate([
            'timetableEntryId' => [
                'required',
                Rule::exists('timetables', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'lessonDate' => ['required', 'date'],
            'lessonTitle' => ['required', 'string', 'max:255'],
            'topic' => ['required', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['planned', 'in_progress', 'completed', 'carried_forward'])],
        ]);
    }

    private function abortUnlessCanManageTimetables(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function abortUnlessCanManageLessonPlanForTimetable(User $user, Timetable $timetable): void
    {
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return;
        }

        abort_unless($user->role === 'teacher' && $timetable->teacher_id === $user->id, 403);
    }

    private function abortUnlessCanManageLessonPlanRecord(User $user, LessonPlan $lessonPlan): void
    {
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return;
        }

        abort_unless($user->role === 'teacher' && $lessonPlan->teacher_id === $user->id, 403);
    }

    private function validateTimetablePayload(Request $request, Organization $organization, ?Timetable $currentEntry): array
    {
        $validated = $request->validate([
            'classId' => [
                'required',
                Rule::exists('classes', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'day' => ['required', Rule::in(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])],
            'periodId' => ['required', 'string', 'max:20', 'regex:/^p[1-9]\d*$/i'],
            'subjectId' => [
                'required',
                Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'teacherId' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)->where('role', 'teacher')),
            ],
            'room' => ['nullable', 'string', 'max:50'],
            'startTime' => ['required', 'date_format:H:i'],
            'endTime' => ['required', 'date_format:H:i', 'after:startTime'],
        ]);

        $validated['periodId'] = strtolower($validated['periodId']);

        $periodOrder = (int) preg_replace('/\D+/', '', $validated['periodId']);
        if ($periodOrder <= 0) {
            $periodOrder = 1;
        }

        $duplicateClassEntry = Timetable::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $validated['classId'])
            ->where('day', strtolower($validated['day']))
            ->where('period_code', $validated['periodId'])
            ->with(['subject:id,name,name_mr,name_hi', 'teacher:id,name'])
            ->when($currentEntry, fn ($query) => $query->where('id', '!=', $currentEntry->id))
            ->first();

        if ($duplicateClassEntry) {
            $request->session()->flash('timetableConflict', [
                'id' => (string) $duplicateClassEntry->id,
                'classId' => (string) $duplicateClassEntry->class_id,
                'day' => ucfirst((string) $duplicateClassEntry->day),
                'periodId' => (string) $duplicateClassEntry->period_code,
                'subject' => $duplicateClassEntry->subject?->name ?? 'Subject',
                'subjectId' => $duplicateClassEntry->subject_id ? (string) $duplicateClassEntry->subject_id : '',
                'teacherId' => $duplicateClassEntry->teacher_id ? (string) $duplicateClassEntry->teacher_id : '',
                'teacherName' => $duplicateClassEntry->teacher?->name ?? 'Teacher not assigned',
                'room' => (string) ($duplicateClassEntry->room_number ?? 'TBD'),
                'startTime' => substr((string) $duplicateClassEntry->start_time, 0, 5),
                'endTime' => substr((string) $duplicateClassEntry->end_time, 0, 5),
            ]);

            throw ValidationException::withMessages([
                'periodId' => sprintf(
                    'This class already has %s with %s scheduled for %s - %s in %s on %s %s.',
                    $duplicateClassEntry->subject?->name ?? 'a subject',
                    $duplicateClassEntry->teacher?->name ?? 'an assigned teacher',
                    substr((string) $duplicateClassEntry->start_time, 0, 5),
                    substr((string) $duplicateClassEntry->end_time, 0, 5),
                    $duplicateClassEntry->room_number ?: 'the saved room',
                    ucfirst((string) $duplicateClassEntry->day),
                    strtoupper((string) $duplicateClassEntry->period_code),
                ),
            ]);
        }

        $overlappingClassEntry = Timetable::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $validated['classId'])
            ->where('day', strtolower($validated['day']))
            ->where('start_time', '<', $validated['endTime'])
            ->where('end_time', '>', $validated['startTime'])
            ->when($currentEntry, fn ($query) => $query->where('id', '!=', $currentEntry->id))
            ->exists();

        if ($overlappingClassEntry) {
            throw ValidationException::withMessages([
                'startTime' => 'This class already has another timetable entry that overlaps with the selected time.',
            ]);
        }

        return [
            'class_id' => (int) $validated['classId'],
            'subject_id' => (int) $validated['subjectId'],
            'teacher_id' => (int) $validated['teacherId'],
            'day' => strtolower($validated['day']),
            'period_code' => $validated['periodId'],
            'period_order' => $periodOrder,
            'start_time' => $validated['startTime'],
            'end_time' => $validated['endTime'],
            'room_number' => $validated['room'] ?: null,
            'period_type' => 'lecture',
        ];
    }

    private function getSectionRecords(Organization $organization): array
    {
        $classSections = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->pluck('section')
            ->all();

        return collect([...($organization->settings['sections'] ?? []), ...$classSections])
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function syncSectionSettings(Organization $organization, ?string $newSection = null): void
    {
        $classSections = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->pluck('section')
            ->all();

        $sections = collect([...($organization->settings['sections'] ?? []), ...$classSections, $newSection])
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'sections' => $sections,
            ],
        ]);
    }
}
