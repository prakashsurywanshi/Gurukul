<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EndToEndPreviewTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): array
    {
        $organization = Organization::create([
            'name' => 'Preview School',
            'slug' => 'preview-school',
            'email' => 'school@preview.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    private function seedBaseData(Organization $organization): void
    {
        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sections = ['A', 'B'];
        $classIds = [];
        foreach ($sections as $i => $section) {
            $classIds[] = DB::table('classes')->insertGetId([
                'organization_id' => $organization->id,
                'academic_year_id' => $academicYearId,
                'name' => '10',
                'section' => $section,
                'room_number' => 'R' . ($i + 1),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('students')->insert([
            'organization_id' => $organization->id,
            'first_name' => 'Test',
            'last_name' => 'Student',
            'email' => 'student@preview.test',
            'class_id' => $classIds[0],
            'status' => 'active',
            'admission_no' => 'ADM-0001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_all_twenty_module_pages_load(): void
    {
        [$organization, $admin] = $this->makeAdmin();
        $this->seedBaseData($organization);

        $this->actingAs($admin);

        $pages = [
            '/attendance-qr',       // QR Code Attendance
            '/study-materials',     // Study Materials
            '/question-bank',       // Question Bank
            '/e-library',           // E-Library
            '/online-classes',      // Live Online Classes
            '/syllabus',            // Syllabus Coverage
            '/scholarships',        // Scholarship & Discounts
            '/tally',               // Tally Export
            '/helpdesk',            // Parent Helpdesk
            '/chat',                // Live Chat
            '/teacher-evaluations', // Teacher Evaluations
            '/staff/id-cards',      // Staff ID Cards
            '/recruitment',         // Recruitment & Hiring
            '/purchase-orders',     // Vendors & Purchase Orders
            '/auto-timetable',      // Auto Timetable
            '/backups',             // Automated Backups
            '/ai-assistant',        // AI Assistant
        ];

        $failures = [];
        foreach ($pages as $page) {
            $response = $this->get($page);
            if (!$response->isSuccessful()) {
                $failures[] = $page . ' -> ' . $response->getStatusCode();
            }
        }

        $this->assertSame([], $failures, implode("\n", $failures));
    }
}