<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LessonPlan;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LessonPlanApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_approve_and_withdraw_lesson_plan(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $plan = $this->createLessonPlan($organization, $admin);

        $this->actingAs($admin)
            ->patch("/lesson-plan/{$plan->id}/approve", ['approved' => true])
            ->assertRedirect('/lesson-plan');

        $this->assertNotNull($plan->fresh()->approved_by);
        $this->assertNotNull($plan->fresh()->approved_at);
        $this->assertSame($admin->id, $plan->fresh()->approved_by);

        $this->actingAs($admin)
            ->patch("/lesson-plan/{$plan->id}/approve", ['approved' => false])
            ->assertRedirect('/lesson-plan');

        $this->assertNull($plan->fresh()->approved_by);
        $this->assertNull($plan->fresh()->approved_at);
    }

    public function test_teacher_cannot_approve_lesson_plan(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $plan = $this->createLessonPlan($organization, $teacher);

        $this->actingAs($teacher)
            ->patch("/lesson-plan/{$plan->id}/approve", ['approved' => true])
            ->assertForbidden();

        $this->assertNull($plan->fresh()->approved_by);
    }

    public function test_lesson_plan_approval_is_scoped_to_organization(): void
    {
        $organization = $this->createOrganization();
        $otherOrganization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $plan = $this->createLessonPlan($otherOrganization, $admin);

        $this->actingAs($admin)
            ->patch("/lesson-plan/{$plan->id}/approve", ['approved' => true])
            ->assertForbidden();

        $this->assertNull($plan->fresh()->approved_by);
    }

    public function test_lesson_plan_page_exposes_approval_fields(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $plan = $this->createLessonPlan($organization, $admin);

        $this->actingAs($admin)
            ->patch("/lesson-plan/{$plan->id}/approve", ['approved' => true])
            ->assertRedirect('/lesson-plan');

        $this->actingAs($admin)
            ->get('/lesson-plan')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/LessonPlanManagement')
                ->where('lessonPlans.0.approvedByName', $admin->name)
                ->where('lessonPlans.0.approvedBy', (string) $admin->id)
            );
    }

    private function createLessonPlan(Organization $organization, User $teacher): LessonPlan
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'theory',
        ]);

        $timetable = Timetable::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day' => 'monday',
            'period_code' => 'p1',
            'period_order' => 1,
            'start_time' => '08:30',
            'end_time' => '09:15',
            'room_number' => '101',
            'period_type' => 'lecture',
        ]);

        return LessonPlan::query()->create([
            'organization_id' => $organization->id,
            'timetable_id' => $timetable->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'lesson_date' => '2026-05-24',
            'lesson_title' => 'Algebra',
            'topic' => 'Linear equations',
            'status' => 'planned',
            'created_by' => $teacher->id,
            'updated_by' => $teacher->id,
        ]);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Lesson Approval School '.$counter,
            'slug' => 'lesson-approval-school-'.$counter,
            'email' => 'lesson-approval-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role, $secondOrg = null): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => 'lesson-'.$role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}