<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Assessment;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssessmentFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_assessment_page(): void
    {
        [$organization, $admin] = $this->seedRole();
        $class = $this->createClass($organization, 'Class 5');
        $subject = Subject::query()->create(['organization_id' => $organization->id, 'name' => 'Science']);
        Assessment::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Unit Test 1',
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'assessment_type' => 'term',
            'weightage' => 30,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/assessment')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Assessment')
                ->has('assessments', 1)
                ->where('assessments.0.name', 'Unit Test 1')
                ->where('assessments.0.class', 'Class 5'));
    }

    public function test_admin_can_create_assessment(): void
    {
        [$organization, $admin] = $this->seedRole();
        $class = $this->createClass($organization, 'Class 6');

        $this->actingAs($admin)
            ->post('/assessment', [
                'name' => 'Term Exam',
                'class_id' => $class->id,
                'term' => 'Term 1',
                'assessment_type' => 'term',
                'weightage' => 50,
                'total_marks' => 100,
                'status' => 'active',
                'description' => 'Mid year exams.',
            ])
            ->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('assessments', [
            'organization_id' => $organization->id,
            'name' => 'Term Exam',
            'class_id' => $class->id,
            'weightage' => 50,
        ]);
    }

    public function test_admin_can_update_assessment(): void
    {
        [$organization, $admin] = $this->seedRole();
        $assessment = Assessment::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Old Name',
            'assessment_type' => 'continuous',
            'weightage' => 10,
            'status' => 'draft',
        ]);

        $this->actingAs($admin)
            ->patch("/assessment/{$assessment->id}", [
                'name' => 'Renamed Exam',
                'assessment_type' => 'term',
                'weightage' => 40,
                'status' => 'active',
            ])
            ->assertSessionDoesntHaveErrors();

        $assessment->refresh();
        $this->assertSame('Renamed Exam', $assessment->name);
        $this->assertSame('term', $assessment->assessment_type);
        $this->assertSame(40, (int) $assessment->weightage);
        $this->assertSame('active', $assessment->status);
    }

    public function test_admin_can_delete_assessment(): void
    {
        [$organization, $admin] = $this->seedRole();
        $assessment = Assessment::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Discontinued',
            'assessment_type' => 'continuous',
            'weightage' => 5,
            'status' => 'completed',
        ]);

        $this->actingAs($admin)->delete("/assessment/{$assessment->id}");

        $this->assertDatabaseMissing('assessments', ['id' => $assessment->id]);
    }

    public function test_cannot_modify_assessment_from_another_organization(): void
    {
        [$organization, $admin] = $this->seedRole();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($other);
        $foreign = Assessment::query()->create([
            'organization_id' => $other->id,
            'name' => 'Foreign Exam',
            'assessment_type' => 'continuous',
            'weightage' => 10,
            'status' => 'active',
        ]);

        $this->actingAs($admin)->patch("/assessment/{$foreign->id}", [
            'name' => 'Hacked',
            'assessment_type' => 'continuous',
            'weightage' => 100,
            'status' => 'active',
        ])->assertForbidden();
        $this->actingAs($admin)->delete("/assessment/{$foreign->id}")->assertForbidden();

        $this->assertDatabaseHas('assessments', ['id' => $foreign->id, 'name' => 'Foreign Exam']);
    }

    public function test_teacher_can_view_assessments_but_driver_cannot(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
        $driver = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'driver',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/assessment')->assertOk();
        $this->actingAs($driver)->get('/assessment')->assertForbidden();
    }

    private function createClass(Organization $organization, string $name): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $this->createAcademicYear($organization)->id,
            'name' => $name,
            'section' => 'A',
            'status' => 'active',
        ]);
    }

    private function createAcademicYear(Organization $organization): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function seedRole(): array
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Assessment School '.$counter,
            'slug' => 'assessment-school-'.$counter,
            'email' => 'assessment-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Pune',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '411001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}