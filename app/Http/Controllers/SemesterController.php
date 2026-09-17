<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\Semester;
use App\Services\OrgTypePolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class SemesterController extends Controller
{
    public function __construct(private readonly OrgTypePolicy $orgTypePolicy)
    {
    }

    public function index(Request $request): InertiaResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $this->abortUnlessCollegeMode($organization);

        $academicYear = $organization->selectedAcademicYear();

        abort_unless($academicYear, 403, 'No active academic session found.');

        $semesters = Semester::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYear->id)
            ->orderBy('sem_no')
            ->get()
            ->map(fn (Semester $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'sem_no' => $s->sem_no,
                'start_date' => $s->start_date->format('Y-m-d'),
                'end_date' => $s->end_date->format('Y-m-d'),
                'is_current' => $s->is_current,
            ]);

        $existingSemCount = Semester::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYear->id)
            ->count();

        return Inertia::render('dashboard/SemesterSettings', [
            'user' => $user,
            'academicYear' => [
                'id' => $academicYear->id,
                'name' => $academicYear->name,
                'start_date' => $academicYear->start_date->format('Y-m-d'),
                'end_date' => $academicYear->end_date->format('Y-m-d'),
            ],
            'semesters' => $semesters,
            'nextSemNo' => $existingSemCount + 1,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $this->abortUnlessCollegeMode($organization);

        $academicYear = $organization->selectedAcademicYear();

        abort_unless($academicYear, 403, 'No active academic session found.');

        $maxSemesters = 10;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'sem_no' => ['required', 'integer', "min:1", "max:{$maxSemesters}"],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ], [
            'name.required' => 'Semester name is required.',
            'sem_no.min' => 'Semester number must be at least 1.',
            'sem_no.max' => "A maximum of {$maxSemesters} semesters is allowed per session.",
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
        ]);

        $validated['organization_id'] = $organization->id;
        $validated['academic_year_id'] = $academicYear->id;
        $validated['is_current'] = false;

        Semester::create($validated);

        return redirect()->route('semesters.index')
            ->with('success', 'Semester created.');
    }

    public function setCurrent(Semester $semester)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $semester->organization_id === $organization->id, 403);

        $this->abortUnlessCollegeMode($organization);

        Semester::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $semester->academic_year_id)
            ->update(['is_current' => false]);

        $semester->update(['is_current' => true]);

        return redirect()->route('semesters.index')
            ->with('success', 'Current semester updated.');
    }

    public function update(Request $request, Semester $semester)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $semester->organization_id === $organization->id, 403);

        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],
        ]);

        $semester->update($validated);

        return redirect()->route('semesters.index')
            ->with('success', 'Semester updated.');
    }

    public function destroy(Semester $semester, Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $semester->organization_id === $organization->id, 403);

        $this->abortUnlessCollegeMode($organization);

        $semester->delete();

        return $request->wantsJson()
            ? response()->json(['ok' => true])
            : redirect()->route('semesters.index')
                ->with('success', 'Semester deleted.');
    }

    private function abortUnlessCollegeMode(Organization $organization): void
    {
        $this->orgTypePolicy->assertSupportsCourses($organization);
    }

    private function resolveOrganizationForUser(?\App\Models\User $user): ?Organization
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