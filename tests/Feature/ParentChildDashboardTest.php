<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ParentChildDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Parent School',
            'slug' => 'parent-school',
            'email' => 'school@parent.test',
            'phone' => '5550000002',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $parentId = DB::table('users')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Rahul Sharma',
            'email' => 'rahul.sharma@parent.test',
            'password' => bcrypt('password'),
            'role' => 'student',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('classes')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => $academicYearId,
            'name' => '10',
            'section' => 'A',
            'room_number' => 'R1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $firstChildId = DB::table('students')->insertGetId([
            'organization_id' => $organization,
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'rahul.sharma@parent.test',
            'user_id' => $parentId,
            'status' => 'active',
            'admission_no' => 'ADM-2001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $secondChildId = DB::table('students')->insertGetId([
            'organization_id' => $organization,
            'first_name' => 'Kabir',
            'last_name' => 'Sharma',
            'email' => 'kabir@school.test',
            'status' => 'active',
            'admission_no' => 'ADM-2002',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(12)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
            'father_email' => 'rahul.sharma@parent.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $parent = User::query()->find($parentId);

        return [$parent, $organization, $firstChildId, $secondChildId];
    }

    public function test_student_dashboard_builds_multi_child_payload(): void
    {
        [$parent, , $firstChildId, $secondChildId] = $this->seedContext();

        $this->actingAs($parent)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DashboardHome')
                ->where('dashboardType', 'student')
                ->where('selectedStudentId', (string) $firstChildId)
                ->has('studentChildren', 2)
                ->where('studentChildren.0.id', (string) $firstChildId)
                ->where('studentChildren.1.id', (string) $secondChildId)
                ->where('studentRecord.id', (string) $firstChildId));
    }

    public function test_student_dashboard_switches_to_requested_child(): void
    {
        [$parent, , , $secondChildId] = $this->seedContext();

        $this->actingAs($parent)
            ->get('/dashboard?student=' . $secondChildId)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DashboardHome')
                ->where('selectedStudentId', (string) $secondChildId)
                ->where('studentRecord.id', (string) $secondChildId)
                ->where('studentRecord.name', 'Kabir Sharma'));
    }

    public function test_student_dashboard_ignores_student_id_outside_children(): void
    {
        [$parent, , $firstChildId] = $this->seedContext();

        $this->actingAs($parent)
            ->get('/dashboard?student=999999')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DashboardHome')
                ->where('selectedStudentId', (string) $firstChildId));
    }
}