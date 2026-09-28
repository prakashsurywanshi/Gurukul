<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();
        User::query()->firstOrCreate([
            'email' => 'superadmin@gurukul.com',
        ], [
            'name' => 'Super Admin',
            'password' => bcrypt('superadmin123'),
            'role' => 'super_admin',
        ]);

        $organization = Organization::query()->firstOrCreate(
            ['email' => 'admin@gurukul.com'],
            [
                'name' => 'Gurukul Public School',
                'slug' => Str::slug('Gurukul Public School'),
                'phone' => '9876543210',
                'address' => '12 Knowledge Park',
                'city' => 'Lucknow',
                'state' => 'Uttar Pradesh',
                'country' => 'India',
                'pincode' => '226010',
                'website' => 'https://gurukul.example.com',
                'type' => 'school',
                'status' => 'active',
                'subscription_plan' => 'basic',
                'max_students' => 1000,
                'max_staff' => 100,
                'settings' => [
                    'academic_year_start' => '2025-04-01',
                    'currency' => 'INR',
                    'timezone' => 'Asia/Kolkata',
                ],
            ]
        );

        User::query()->updateOrCreate([
            'email' => 'admin@gurukul.com',
        ], [
            'name' => 'Admin',
            'organization_id' => $organization->id,
            'password' => bcrypt('admin123'),
            'role' => 'admin',
        ]);

        User::query()->firstOrCreate([
            'email' => 'student@gurukul.com',
        ], [
            'name' => 'Shubham Chaudhari',
            'password' => bcrypt('student123'),
            'role' => 'student',
        ]);

        $this->call(StudentSeeder::class);
        $this->call(DemoAccountsSeeder::class);
        $this->call(TransportDriverSeeder::class);
        $this->call(DemoOrganizationsSeeder::class);
        $this->call(TemplateLibrarySeeder::class);
    }
}
