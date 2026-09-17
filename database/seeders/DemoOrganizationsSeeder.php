<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Database\Seeder;

class DemoOrganizationsSeeder extends Seeder
{
    /**
     * Idempotently seed demo organizations for every organization type
     * (school, college, coaching, university) along with demo accounts.
     */
    public function run(): void
    {
        $definitions = [
            'school' => [
                'name' => 'Gurukul Public School',
                'slug' => 'gurukul-public-school',
                'email' => 'admin@gurukul.com',
                'city' => 'Lucknow',
                'state' => 'Uttar Pradesh',
                'password' => 'admin123',
                'accounts' => [],
            ],
            'college' => [
                'name' => 'Nova College of Science',
                'slug' => 'nova-college-of-science',
                'email' => 'admin@college.gurukul.com',
                'city' => 'Pune',
                'state' => 'Maharashtra',
                'password' => 'college123',
                'accounts' => ['teacher', 'student', 'accountant'],
            ],
            'coaching' => [
                'name' => 'Shine Test Prep Academy',
                'slug' => 'shine-test-prep-academy',
                'email' => 'admin@coaching.gurukul.com',
                'city' => 'Kota',
                'state' => 'Rajasthan',
                'password' => 'coaching123',
                'accounts' => ['teacher', 'student', 'accountant'],
            ],
            'university' => [
                'name' => 'Sarvamaya University',
                'slug' => 'sarvamaya-university',
                'email' => 'admin@university.gurukul.com',
                'city' => 'Bengaluru',
                'state' => 'Karnataka',
                'password' => 'university123',
                'accounts' => ['teacher', 'student', 'accountant'],
            ],
        ];

        foreach ($definitions as $type => $definition) {
            $organization = Organization::query()->firstOrCreate(
                ['email' => $definition['email']],
                [
                    'name' => $definition['name'],
                    'slug' => $definition['slug'],
                    'phone' => '9876500'.str_pad((string) (array_search($type, array_keys($definitions)) + 1), 3, '0', STR_PAD_LEFT),
                    'address' => 'Demo Campus',
                    'city' => $definition['city'],
                    'state' => $definition['state'],
                    'country' => 'India',
                    'pincode' => '110001',
                    'website' => 'https://'.$definition['slug'].'.example.com',
                    'type' => $type,
                    'status' => 'active',
                    'subscription_plan' => 'premium',
                    'subscription_start_date' => now()->subMonth()->toDateString(),
                    'subscription_end_date' => now()->addYear()->toDateString(),
                    'max_students' => 2000,
                    'max_staff' => 200,
                    'settings' => [
                        'academic_year_start' => '2025-04-01',
                        'currency' => 'INR',
                        'timezone' => 'Asia/Kolkata',
                    ],
                ]
            );

            app(StaffPermissionService::class)->ensureRolesExist($organization);

            $academicYear = AcademicYear::query()->firstOrCreate(
                ['organization_id' => $organization->id, 'name' => '2025-2026'],
                [
                    'start_date' => '2025-04-01',
                    'end_date' => '2026-03-31',
                    'is_current' => true,
                    'status' => 'active',
                ]
            );

            $academicYear->update(['is_current' => true, 'status' => 'active']);

            User::query()->updateOrCreate(
                ['email' => $definition['email']],
                [
                    'name' => ucfirst($type).' Admin Demo',
                    'password' => bcrypt($definition['password']),
                    'role' => 'admin',
                    'status' => 'active',
                    'organization_id' => $organization->id,
                ]
            );

            foreach ($definition['accounts'] as $role) {
                $email = $role.'@'.$type.'.gurukul.com';

                User::query()->updateOrCreate(
                    ['email' => $email],
                    [
                        'name' => ucfirst($role).' '.ucfirst($type).' Demo',
                        'password' => bcrypt($role.'123'),
                        'role' => $role,
                        'status' => 'active',
                        'organization_id' => $organization->id,
                    ]
                );
            }
        }
    }
}
