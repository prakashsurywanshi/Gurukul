<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\User;
use App\Services\ActiveOrgResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BranchAdminController extends Controller
{
    public function index(ActiveOrgResolver $resolver)
    {
        $user = Auth::user();

        if (! in_array($user->role, ['super_admin', 'branch_admin'], true)) {
            abort(403, 'Branch Admin is available to head-office and branch administrators only.');
        }

        if ($user->role === 'branch_admin') {
            $activeOrgId = $resolver->resolveForRequest(request());

            $branches = $user->managedOrganizations()
                ->withCount(['students', 'users'])
                ->orderBy('name')
                ->get()
                ->map(function (Organization $organization) {
                    return $this->branchPayload($organization);
                });

            return inertia('dashboard/BranchAdmin', [
                'user' => $user,
                'branches' => $branches,
                'activeBranchId' => $activeOrgId,
                'isSuperAdmin' => false,
            ]);
        }

        $branchAdmins = User::query()
            ->where('role', 'branch_admin')
            ->with('managedOrganizations')
            ->orderBy('name')
            ->get()
            ->map(fn (User $admin) => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'status' => $admin->status,
                'created_at' => optional($admin->created_at)->toDateString(),
                'organization_ids' => $admin->managedOrganizations->pluck('id')->map(fn ($id) => (int) $id)->all(),
            ]);

        $organizations = Organization::query()
            ->withCount(['students', 'users'])
            ->orderBy('name')
            ->get()
            ->map(fn (Organization $organization) => $this->branchPayload($organization));

        return inertia('dashboard/BranchAdmin', [
            'user' => $user,
            'branches' => $organizations,
            'branchAdmins' => $branchAdmins,
            'activeBranchId' => null,
            'isSuperAdmin' => true,
        ]);
    }

    public function storeBranchAdmin(Request $request)
    {
        $this->requireSuperAdmin();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'organization_ids' => ['sometimes', 'array'],
            'organization_ids.*' => ['integer', 'exists:organizations,id'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'branch_admin',
            'status' => 'active',
            'organization_id' => null,
        ]);

        if (! empty($validated['organization_ids'])) {
            $user->managedOrganizations()->sync($validated['organization_ids']);
        }

        return back()->with('success', 'Branch admin created.');
    }

    public function updateAssignments(Request $request, User $user, ActiveOrgResolver $resolver)
    {
        $this->requireSuperAdmin();

        abort_unless($user->role === 'branch_admin', 422, 'User is not a branch admin.');

        $validated = $request->validate([
            'organization_ids' => ['required', 'array'],
            'organization_ids.*' => ['integer', 'exists:organizations,id'],
        ]);

        $user->managedOrganizations()->sync($validated['organization_ids']);

        session()->forget('branch_admin_active_org_id');

        return back()->with('success', 'Branch assignments updated.');
    }

    public function switchBranch(ActiveOrgResolver $resolver, Organization $organization)
    {
        $user = Auth::user();

        abort_unless($user->role === 'branch_admin', 403);

        if (! $resolver->switchBranch($user, (int) $organization->id)) {
            abort(403, 'You are not assigned to this branch.');
        }

        return redirect('/dashboard');
    }

    public function leaveBranch(ActiveOrgResolver $resolver)
    {
        $user = Auth::user();

        abort_unless($user->role === 'branch_admin', 403);

        $resolver->leaveBranch($user);

        return back()->with('success', 'Returned to head office.');
    }

    public function destroy(User $user)
    {
        $this->requireSuperAdmin();

        abort_unless($user->role === 'branch_admin', 422, 'User is not a branch admin.');

        $user->managedOrganizations()->detach();
        $user->update(['status' => 'inactive']);

        return back()->with('success', 'Branch admin deactivated.');
    }

    private function branchPayload(Organization $organization): array
    {
        $lastSession = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->latest()
            ->value('name');

        return [
            'id' => (int) $organization->id,
            'name' => $organization->name,
            'email' => $organization->email,
            'phone' => $organization->phone,
            'students_count' => $organization->students_count,
            'users_count' => $organization->users_count,
            'current_session' => $lastSession ?? 'Not set',
            'subscription_status' => $organization->subscriptionIsExpired() ? 'expired' : 'active',
            'expiry_date' => optional($organization->subscription_end_date)->toDateString(),
        ];
    }

    private function requireSuperAdmin(): void
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'super_admin') {
            abort(403, 'Super administrator access required.');
        }
    }
}