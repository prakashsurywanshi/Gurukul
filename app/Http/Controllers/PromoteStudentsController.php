<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\AlumniRecord;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PromoteStudentsController extends Controller
{
    public function __construct(private readonly StudentAcademicHistoryService $studentAcademicHistoryService)
    {
    }

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/PromoteStudents', [
            'user' => $user,
            'classRecords' => $organization ? $this->getClassRecords($organization) : collect(),
            'studentRecords' => $organization ? $this->getStudentRecords($organization) : collect(),
            'sessions' => $organization ? $this->getSessions($organization) : [],
        ]);
    }

    public function promote(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'from_class' => ['required', 'string', 'max:255'],
            'to_class' => ['required', 'string', 'max:255', 'different:from_class'],
            'target_session' => ['required', 'string', 'max:255'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer'],
        ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['student_ids'])
            ->with('schoolClass:id,name,section')
            ->get();

        $eligibleStudents = $students->filter(fn (Student $student) => $student->schoolClass?->name === $validated['from_class']);

        if ($eligibleStudents->isEmpty()) {
            return back()->with('error', 'No matching students were found for the selected class.');
        }

        $targetAcademicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['target_session'])
            ->first();

        if (! $targetAcademicYear) {
            return back()->with('error', 'The selected target session could not be found.');
        }

        $targetClasses = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $targetAcademicYear->id)
            ->where('name', $validated['to_class'])
            ->where('status', 'active')
            ->get()
            ->keyBy('section');

        if ($targetClasses->isEmpty()) {
            $targetClasses = $this->createTargetSessionClassesFromTemplates(
                $organization,
                $targetAcademicYear->id,
                $validated['to_class'],
                $eligibleStudents
                    ->map(fn (Student $student) => $student->schoolClass?->section)
                    ->filter()
                    ->unique()
                    ->values()
                    ->all()
            );
        }

        $missingSections = $eligibleStudents
            ->map(fn (Student $student) => $student->schoolClass?->section)
            ->filter()
            ->unique()
            ->reject(fn (?string $section) => $targetClasses->has($section))
            ->values();

        if ($missingSections->isNotEmpty()) {
            $createdTargetClasses = $this->createTargetSessionClassesFromTemplates(
                $organization,
                $targetAcademicYear->id,
                $validated['to_class'],
                $missingSections->all()
            );

            if ($createdTargetClasses->isNotEmpty()) {
                $targetClasses = $targetClasses->merge($createdTargetClasses);
                $missingSections = $missingSections
                    ->reject(fn (?string $section) => $targetClasses->has($section))
                    ->values();
            }
        }

        if ($missingSections->isNotEmpty()) {
            return back()->with(
                'error',
                'Create target class ' . $validated['to_class'] . ' for section ' . $missingSections->implode(', ') . ' before promoting students.'
            );
        }

        DB::transaction(function () use ($eligibleStudents, $targetClasses, $targetAcademicYear, $validated) {
            foreach ($eligibleStudents as $student) {
                $section = $student->schoolClass?->section;
                $targetClass = $section ? $targetClasses->get($section) : null;

                if (!$targetClass) {
                    continue;
                }

                $student->update([
                    'class_id' => $targetClass->id,
                    'status' => $student->status === 'inactive' ? 'inactive' : 'active',
                ]);

                $this->studentAcademicHistoryService->promoteStudent(
                    $student->fresh('schoolClass'),
                    $targetClass,
                    $targetAcademicYear,
                    sprintf(
                        'Promoted from Class %s to Class %s for session %s.',
                        $validated['from_class'],
                        $validated['to_class'],
                        $validated['target_session']
                    )
                );
            }
        });

        return redirect()
            ->route('promote-students')
            ->with('success', $eligibleStudents->count() . ' student' . ($eligibleStudents->count() === 1 ? '' : 's') . ' promoted successfully.');
    }

    public function saveToAlumni(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'from_class' => ['required', 'string', 'max:255'],
            'target_session' => ['required', 'string', 'max:255'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer'],
        ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['student_ids'])
            ->with('schoolClass:id,name,section')
            ->get();

        $eligibleStudents = $students->filter(fn (Student $student) => $student->schoolClass?->name === $validated['from_class']);

        if ($eligibleStudents->isEmpty()) {
            return back()->with('error', 'No matching students were found for alumni transfer.');
        }

        $academicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['target_session'])
            ->value('id');

        foreach ($eligibleStudents as $student) {
            AlumniRecord::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'student_id' => $student->id,
                    'session' => $validated['target_session'],
                ],
                [
                    'academic_year_id' => $academicYearId,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'email' => $student->email,
                    'phone' => $student->phone,
                    'class' => $student->schoolClass?->name,
                    'section' => $student->schoolClass?->section,
                    'passing_year' => $validated['target_session'],
                    'alumni_status' => 'left_school',
                    'current_city' => $student->city,
                    'organization_name' => 'Left School',
                ]
            );
        }

        return redirect()
            ->route('promote-students')
            ->with('success', $eligibleStudents->count() . ' student' . ($eligibleStudents->count() === 1 ? '' : 's') . ' saved to alumni successfully.');
    }

    private function getClassRecords(Organization $organization)
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->with('academicYear:id,name')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section', 'academic_year_id'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
                'session' => $schoolClass->academicYear?->name,
                'academic_year_id' => $schoolClass->academic_year_id,
            ]);
    }

    private function createTargetSessionClassesFromTemplates(
        Organization $organization,
        int $targetAcademicYearId,
        string $className,
        array $sections
    ) {
        $normalizedSections = collect($sections)
            ->filter(fn (?string $section) => filled($section))
            ->map(fn (string $section) => trim($section))
            ->unique()
            ->values();

        if ($normalizedSections->isEmpty()) {
            return collect();
        }

        $existingTargetClasses = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $targetAcademicYearId)
            ->where('name', $className)
            ->whereIn('section', $normalizedSections)
            ->get()
            ->keyBy('section');

        $sectionsToCreate = $normalizedSections
            ->reject(fn (string $section) => $existingTargetClasses->has($section))
            ->values();

        if ($sectionsToCreate->isEmpty()) {
            return $existingTargetClasses;
        }

        $templateClasses = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('name', $className)
            ->whereIn('section', $sectionsToCreate)
            ->orderByDesc('academic_year_id')
            ->orderByDesc('id')
            ->get()
            ->keyBy('section');

        foreach ($sectionsToCreate as $section) {
            $templateClass = $templateClasses->get($section);

            if (! $templateClass) {
                continue;
            }

            $createdClass = SchoolClass::query()->create([
                'organization_id' => $organization->id,
                'academic_year_id' => $targetAcademicYearId,
                'name' => $templateClass->name,
                'section' => $templateClass->section,
                'class_teacher_id' => $templateClass->class_teacher_id,
                'capacity' => $templateClass->capacity,
                'room_number' => $templateClass->room_number,
                'description' => $templateClass->description,
                'status' => 'active',
            ]);

            $existingTargetClasses->put($section, $createdClass);
        }

        return $existingTargetClasses;
    }

    private function getStudentRecords(Organization $organization)
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section,academic_year_id', 'schoolClass.academicYear:id,name')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(function (Student $student) {
                return [
                    'id' => (string) $student->id,
                    'session_id' => $student->schoolClass?->academic_year_id,
                    'session' => $student->schoolClass?->academicYear?->name,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'class' => $student->schoolClass?->name,
                    'section' => $student->schoolClass?->section,
                    'roll_number' => $student->roll_number,
                    'status' => $student->status,
                ];
            })
            ->values();
    }

    private function getSessions(Organization $organization): array
    {
        $sessions = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->pluck('name')
            ->filter()
            ->values()
            ->all();

        if (!empty($sessions)) {
            return $sessions;
        }

        return collect($organization->settings['sessions'] ?? [])
            ->filter()
            ->values()
            ->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
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
