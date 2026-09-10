<?php

namespace App\Http\Controllers;

use App\Models\AppraisalCycle;
use App\Models\Organization;
use App\Models\StaffAppraisal;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StaffAppraisalsController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $cycles = AppraisalCycle::query()
            ->where('organization_id', $organization->id)
            ->withCount('appraisals')
            ->orderByDesc('starts_on')
            ->get()
            ->map(fn (AppraisalCycle $cycle) => [
                'id' => $cycle->id,
                'name' => $cycle->name,
                'startsOn' => $cycle->starts_on->toDateString(),
                'endsOn' => $cycle->ends_on->toDateString(),
                'status' => $cycle->status,
                'appraisalsCount' => $cycle->appraisals_count,
                'description' => $cycle->description,
            ]);

        $appraisals = StaffAppraisal::query()
            ->where('organization_id', $organization->id)
            ->with(['staff:id,name,role', 'cycle:id,name', 'reviewer:id,name'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (StaffAppraisal $appraisal) => [
                'id' => $appraisal->id,
                'staffName' => $appraisal->staff?->name,
                'staffRole' => RolePermissionCatalog::displayNameForSlug($appraisal->staff?->role ?? '') ?? $appraisal->staff?->role,
                'cycleName' => $appraisal->cycle?->name,
                'cycleId' => $appraisal->cycle?->id,
                'criteria' => $appraisal->criteria ?? [],
                'overallScore' => $appraisal->overall_score,
                'rating' => $appraisal->rating,
                'reviewerName' => $appraisal->reviewer?->name,
                'feedback' => $appraisal->feedback,
                'status' => $appraisal->status,
                'reviewDate' => $appraisal->review_date?->toDateString(),
            ]);

        return Inertia::render('dashboard/StaffAppraisals', [
            'cycles' => $cycles,
            'appraisals' => $appraisals,
            'staffOptions' => $this->staffOptions($organization),
            'summary' => [
                'activeCycles' => $cycles->filter(fn ($cycle) => $cycle['status'] === 'active')->count(),
                'completed' => $appraisals->filter(fn ($appraisal) => $appraisal['status'] === 'completed')->count(),
                'avgScore' => $appraisals->filter(fn ($appraisal) => $appraisal['overallScore'] !== null)->map(fn ($appraisal) => $appraisal['overallScore'])->avg(),
            ],
        ]);
    }

    public function storeCycle(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'status' => ['required', Rule::in(['active', 'completed'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        AppraisalCycle::query()->create($validated + ['organization_id' => $organization->id]);

        return back()->with('success', 'Appraisal cycle created.');
    }

    public function updateCycle(Request $request, AppraisalCycle $appraisalCycle): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($appraisalCycle->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'status' => ['required', Rule::in(['active', 'completed'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $appraisalCycle->update($validated);

        return back()->with('success', 'Appraisal cycle updated.');
    }

    public function destroyCycle(Request $request, AppraisalCycle $appraisalCycle): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($appraisalCycle->organization_id === $organization->id, 404);

        $appraisalCycle->delete();

        return back()->with('success', 'Appraisal cycle deleted.');
    }

    public function storeAppraisal(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'staff_user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('organization_id', $organization->id)],
            'appraisal_cycle_id' => ['required', 'integer', Rule::exists('appraisal_cycles', 'id')->where('organization_id', $organization->id)],
            'overall_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'rating' => ['nullable', 'string', 'max:30'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['draft', 'submitted', 'completed'])],
        ]);

        StaffAppraisal::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $validated['staff_user_id'],
            'appraisal_cycle_id' => $validated['appraisal_cycle_id'],
            'overall_score' => $validated['overall_score'] ?? null,
            'rating' => $validated['rating'] ?? null,
            'reviewer_user_id' => $user->id,
            'feedback' => $validated['feedback'] ?? null,
            'status' => $validated['status'],
            'review_date' => $validated['status'] === 'completed' ? now()->toDateString() : null,
        ]);

        return back()->with('success', 'Appraisal recorded.');
    }

    public function updateAppraisal(Request $request, StaffAppraisal $staffAppraisal): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($staffAppraisal->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'overall_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'rating' => ['nullable', 'string', 'max:30'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['draft', 'submitted', 'completed'])],
        ]);

        $staffAppraisal->update([
            'overall_score' => $validated['overall_score'] ?? null,
            'rating' => $validated['rating'] ?? null,
            'feedback' => $validated['feedback'] ?? null,
            'status' => $validated['status'],
            'review_date' => $validated['status'] === 'completed' ? now()->toDateString() : $staffAppraisal->review_date,
        ]);

        return back()->with('success', 'Appraisal updated.');
    }

    public function destroyAppraisal(Request $request, StaffAppraisal $staffAppraisal): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($staffAppraisal->organization_id === $organization->id, 404);

        $staffAppraisal->delete();

        return back()->with('success', 'Appraisal deleted.');
    }

    private function staffOptions(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => RolePermissionCatalog::displayNameForSlug($user->role) ?? $user->role,
            ])
            ->values()
            ->all();
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
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