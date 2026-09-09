<?php

namespace App\Http\Controllers;

use App\Models\JobPosting;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class RecruitmentController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/Recruitment', [
            'user' => $user,
            'positions' => $this->positions($organization),
            'metrics' => [
                'open' => JobPosting::query()->where('organization_id', $organization->id)->where('status', 'open')->count(),
                'vacancies' => JobPosting::query()->where('organization_id', $organization->id)->where('status', 'open')->sum('vacancies'),
                'total' => JobPosting::query()->where('organization_id', $organization->id)->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        JobPosting::query()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            ...$validated,
        ]);

        return back()->with('success', 'Position created successfully.');
    }

    public function update(Request $request, JobPosting $position): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($position->organization_id === $organization->id, 403);

        $validated = $request->validate($this->rules());

        $position->update($validated);

        return back()->with('success', 'Position updated successfully.');
    }

    public function toggleStatus(Request $request, JobPosting $position): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($position->organization_id === $organization->id, 403);

        $validated = $request->validate(['status' => ['required', Rule::in(['open', 'closed', 'draft'])]]);

        $position->update(['status' => $validated['status']]);

        return back()->with('success', 'Position status updated.');
    }

    public function destroy(JobPosting $position): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($position->organization_id === $organization->id, 403);

        $position->delete();

        return back()->with('success', 'Position deleted successfully.');
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'position_type' => ['required', Rule::in(['full-time', 'part-time', 'contract', 'internship'])],
            'vacancies' => ['nullable', 'integer', 'min:1', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'requirements' => ['nullable', 'string', 'max:5000'],
            'salary_range' => ['nullable', 'string', 'max:100'],
            'qualifications' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['open', 'closed', 'draft'])],
            'application_deadline' => ['nullable', 'date'],
        ];
    }

    private function positions(Organization $organization): array
    {
        return JobPosting::query()
            ->where('organization_id', $organization->id)
            ->with('creator:id,name')
            ->latest()
            ->get()
            ->map(fn (JobPosting $position) => [
                'id' => (string) $position->id,
                'title' => $position->title,
                'department' => $position->department,
                'position_type' => $position->position_type,
                'vacancies' => $position->vacancies,
                'description' => $position->description,
                'requirements' => $position->requirements,
                'salary_range' => $position->salary_range,
                'qualifications' => $position->qualifications,
                'status' => $position->status,
                'application_deadline' => $position->application_deadline?->format('Y-m-d'),
                'created_by' => $position->creator?->name,
                'created_at' => $position->created_at?->toIso8601String(),
            ])
            ->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
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

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}