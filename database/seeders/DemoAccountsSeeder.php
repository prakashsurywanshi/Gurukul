<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Database\Seeder;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->first();

        if (! $organization) {
            return;
        }

        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $academicYear = AcademicYear::query()->first();

        $accounts = [
            'super_admin' => ['Super Admin', 'superadmin123', 'Super Admin'],
            'admin' => ['Admin', 'admin123', 'Admin'],
            'teacher' => ['Teacher', 'teacher123', 'Teacher'],
            'accountant' => ['Accountant', 'accountant123', 'Accountant'],
            'receptionist' => ['Receptionist', 'receptionist123', 'Receptionist'],
            'librarian' => ['Librarian', 'librarian123', 'Librarian'],
            'driver' => ['Driver', 'driver123', 'Driver'],
            'student' => ['Student', 'student123', 'Student'],
        ];

        foreach ($accounts as $role => [$label, $password, $name]) {
            $email = $role === 'super_admin' ? 'superadmin@gurukul.com' : $role.'@gurukul.com';

            $user = User::query()->firstOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => bcrypt($password), 'role' => $role]
            );

            $user->forceFill([
                'name' => $role === 'super_admin' ? $user->name : $label.' Demo',
                'role' => $role,
                'status' => 'active',
                'organization_id' => $role === 'super_admin' ? null : $organization->id,
            ])->save();
        }

        if ($academicYear) {
            $academicYear->update([
                'is_current' => true,
                'status' => 'active',
            ]);
            $organization->update([
                'settings' => array_merge($organization->settings ?? [], [
                    'academic_year_start' => $academicYear->start_date?->toDateString() ?? '2025-04-01',
                ]),
            ]);
        }
    }
}