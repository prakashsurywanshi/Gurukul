<?php

namespace App\Http\Controllers;

use App\Models\DriverProfile;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DriverProfileController extends Controller
{
    public function store(Request $request, StaffPermissionService $permissions): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->requireOrganization();
        abort_unless($permissions->allows($user, 'Transport Management', 'add'), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:20'],
            'licenseNumber' => ['nullable', 'string', 'max:100'],
            'licenseExpiry' => ['nullable', 'date'],
            'licenseCategories' => ['nullable', 'string', 'max:255'],
            'joiningDate' => ['nullable', 'date'],
            'employmentType' => ['nullable', Rule::in(['full_time', 'contract', 'temp'])],
            'emergencyContact' => ['nullable', 'string', 'max:20'],
            'bloodGroup' => ['nullable', 'string', 'max:10'],
            'policyNumber' => ['nullable', 'string', 'max:100'],
            'policyExpiry' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'verificationStatus' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
        ]);

        DB::transaction(function () use ($data, $organization) {
            $driver = User::query()->create([
                'organization_id' => $organization->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => bcrypt(Str::random(16)),
                'role' => 'driver',
                'joining_date' => $data['joiningDate'] ?? null,
                'emergency_contact' => $data['emergencyContact'] ?? null,
                'blood_group' => $data['bloodGroup'] ?? null,
                'status' => $data['status'],
            ]);

            DriverProfile::query()->create([
                'organization_id' => $organization->id,
                'user_id' => $driver->id,
                'license_number' => $data['licenseNumber'] ?? null,
                'license_expiry_date' => $data['licenseExpiry'] ?? null,
                'license_categories' => $data['licenseCategories'] ?? null,
                'joining_date' => $data['joiningDate'] ?? null,
                'employment_type' => $data['employmentType'] ?? null,
                'emergency_contact' => $data['emergencyContact'] ?? null,
                'blood_group' => $data['bloodGroup'] ?? null,
                'policy_number' => $data['policyNumber'] ?? null,
                'policy_expiry_date' => $data['policyExpiry'] ?? null,
                'verification_status' => $data['verificationStatus'] ?? 'pending',
                'status' => $data['status'],
            ]);

            $this->ensureStaffRole($organization);
        });

        return back()->with('success', 'Driver added successfully.');
    }

    public function update(Request $request, $id, StaffPermissionService $permissions): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->requireOrganization();
        abort_unless($permissions->allows($user, 'Transport Management', 'edit'), 403);

        $driver = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'driver')
            ->findOrFail($id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($driver->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'licenseNumber' => ['nullable', 'string', 'max:100'],
            'licenseExpiry' => ['nullable', 'date'],
            'licenseCategories' => ['nullable', 'string', 'max:255'],
            'joiningDate' => ['nullable', 'date'],
            'employmentType' => ['nullable', Rule::in(['full_time', 'contract', 'temp'])],
            'emergencyContact' => ['nullable', 'string', 'max:20'],
            'bloodGroup' => ['nullable', 'string', 'max:10'],
            'policyNumber' => ['nullable', 'string', 'max:100'],
            'policyExpiry' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'verificationStatus' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
        ]);

        DB::transaction(function () use ($data, $driver, $organization) {
            $driver->update([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'joining_date' => $data['joiningDate'] ?? null,
                'emergency_contact' => $data['emergencyContact'] ?? null,
                'blood_group' => $data['bloodGroup'] ?? null,
                'status' => $data['status'],
            ]);

            $profile = $driver->driverProfile ?: new DriverProfile(['organization_id' => $organization->id]);
            $profile->fill([
                'license_number' => $data['licenseNumber'] ?? null,
                'license_expiry_date' => $data['licenseExpiry'] ?? null,
                'license_categories' => $data['licenseCategories'] ?? null,
                'joining_date' => $data['joiningDate'] ?? null,
                'employment_type' => $data['employmentType'] ?? null,
                'emergency_contact' => $data['emergencyContact'] ?? null,
                'blood_group' => $data['bloodGroup'] ?? null,
                'policy_number' => $data['policyNumber'] ?? null,
                'policy_expiry_date' => $data['policyExpiry'] ?? null,
                'verification_status' => $data['verificationStatus'] ?? 'pending',
                'status' => $data['status'],
            ]);
            $profile->user_id = $driver->id;
            $profile->save();
        });

        return back()->with('success', 'Driver updated successfully.');
    }

    public function destroy(Request $request, $id, StaffPermissionService $permissions): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->requireOrganization();
        abort_unless($permissions->allows($user, 'Transport Management', 'delete'), 403);

        $driver = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'driver')
            ->findOrFail($id);

        $driver->update(['status' => 'inactive']);

        if ($driver->driverProfile) {
            $driver->driverProfile->update(['status' => 'inactive']);
        }

        return back()->with('success', 'Driver deactivated.');
    }

    private function ensureStaffRole(Organization $organization): void
    {
        app(StaffPermissionService::class)->ensureRolesExist($organization);
    }

    private function requireOrganization(): Organization
    {
        $user = request()->user();
        $organization = $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;

        abort_unless($organization, 403);

        return $organization;
    }
}