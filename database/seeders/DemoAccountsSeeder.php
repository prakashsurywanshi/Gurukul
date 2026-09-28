<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\DriverProfile;
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
            'transport_manager' => ['Transport Manager', 'transport123', 'Transport Manager'],
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

        $driverDemo = User::query()->where('email', 'driver@gurukul.com')->first();

        if ($driverDemo) {
            DriverProfile::query()->firstOrCreate(
                [
                    'user_id' => $driverDemo->id,
                ],
                [
                    'organization_id' => $organization->id,
                    'license_number' => 'UP-32-2026-7741',
                    'license_expiry_date' => now()->addYears(3)->toDateString(),
                    'license_categories' => 'LMV,LMV-TR',
                    'employment_type' => 'full_time',
                    'verification_status' => 'verified',
                    'status' => 'active',
                ]
            );
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