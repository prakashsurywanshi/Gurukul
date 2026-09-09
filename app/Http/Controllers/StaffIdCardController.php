<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Throwable;

class StaffIdCardController extends Controller
{
    private const STAFF_ROLES = ['admin', 'teacher', 'accountant', 'receptionist', 'librarian'];

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $staff = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', self::STAFF_ROLES)
            ->orderBy('name')
            ->get()
            ->map(fn (User $member) => [
                'id' => (string) $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'phone' => $member->phone,
                'employee_id' => $member->employee_id,
                'designation' => $member->designation,
                'department' => $member->department,
                'role' => $member->role,
                'gender' => $member->gender,
                'blood_group' => $member->blood_group,
                'joining_date' => $member->joining_date?->format('d-m-Y'),
                'profile_photo' => $member->profile_photo,
            ])
            ->all();

        return inertia('dashboard/StaffIdCards', [
            'user' => $user,
            'organization' => ['id' => $organization->id, 'name' => $organization->name],
            'staff' => $staff,
        ]);
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