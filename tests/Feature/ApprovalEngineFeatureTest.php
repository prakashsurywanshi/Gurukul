<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ApprovalFlow;
use App\Models\ApprovalFlowStep;
use App\Models\ApprovalRequest;
use App\Models\LessonPlan;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SystemNotification;
use App\Models\Timetable;
use App\Models\User;
use App\Services\Approvals\ApprovalEngine;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ApprovalEngineFeatureTest extends TestCase
{
    use RefreshDatabase;

    private const MODULE = 'test_module';

    public function test_default_flow_is_single_admin_step_on_first_submit(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');
        $student = $this->seedStudent($organization);

        $request = app(ApprovalEngine::class)->submit(self::MODULE, $teacher, $student, 'Loan verification.');

        $this->assertSame('pending', $request->status);
        $this->assertSame(1, $request->current_step);

        $flow = ApprovalFlow::query()->where('organization_id', $organization->id)->where('module', self::MODULE)->first();
        $this->assertNotNull($flow);
        $this->assertTrue($flow->is_active);

        $steps = $request->steps()->get();
        $this->assertCount(1, $steps);
        $this->assertSame('admin', $steps->first()->actor_value);
    }

    public function test_multi_step_chain_advances_and_finalizes_approved(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $accountant = $this->createUser($organization, 'accountant');
        $student = $this->seedStudent($organization);

        $flow = ApprovalFlow::query()->create([
            'organization_id' => $organization->id,
            'module' => self::MODULE,
            'name' => 'Two-step review',
            'is_active' => true,
        ]);
        ApprovalFlowStep::query()->create([
            'approval_flow_id' => $flow->id,
            'step_no' => 1,
            'actor_type' => 'role',
            'actor_value' => 'admin',
            'note' => 'Head office check',
        ]);
        ApprovalFlowStep::query()->create([
            'approval_flow_id' => $flow->id,
            'step_no' => 2,
            'actor_type' => 'user',
            'actor_value' => (string) $teacher->id,
            'note' => 'Subject teacher final',
        ]);

        $engine = app(ApprovalEngine::class);
        $request = $engine->submit(self::MODULE, $accountant, $student, 'Needs two approvals.');

        $this->assertSame(1, $request->current_step);
        $this->assertCount(1, $engine->actionableFor($admin, $organization));
        $this->assertCount(0, $engine->actionableFor($teacher, $organization));

        $engine->approve($request, $admin, 'Looks fine.');

        $request->refresh();
        $this->assertSame(2, $request->current_step);
        $this->assertSame('pending', $request->status);
        $this->assertCount(0, $engine->actionableFor($admin, $organization));
        $this->assertCount(1, $engine->actionableFor($teacher, $organization));

        $engine->approve($request, $teacher);

        $request->refresh();
        $this->assertSame('approved', $request->status);
        $this->assertNotNull($request->completed_at);
        $this->assertSame('approved', $request->steps()->where('step_no', 2)->first()->status);
    }

    public function test_reject_at_first_step_marks_rejected_and_notifies_requester(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $accountant = $this->createUser($organization, 'accountant');
        $student = $this->seedStudent($organization);

        $engine = app(ApprovalEngine::class);
        $request = $engine->submit(self::MODULE, $accountant, $student, 'Payroll change.');

        $engine->reject($request, $admin, 'Not eligible.');

        $request->refresh();
        $this->assertSame('rejected', $request->status);
        $this->assertSame('rejected', $request->steps()->first()->status);

        $notifications = SystemNotification::query()->where('user_id', $accountant->id)->where('type', 'approval_request')->get();
        $this->assertCount(1, $notifications);
        $this->assertSame('Request rejected', $notifications->first()->title);
    }

    public function test_requester_can_cancel_but_staff_cannot(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $accountant = $this->createUser($organization, 'accountant');
        $student = $this->seedStudent($organization);

        $engine = app(ApprovalEngine::class);
        $request = $engine->submit(self::MODULE, $accountant, $student, 'Membership.');

        $this->expectException(HttpException::class);
        $engine->cancel($request, $admin);
    }

    public function test_requester_can_cancel_pending_request(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $accountant = $this->createUser($organization, 'accountant');
        $student = $this->seedStudent($organization);

        $engine = app(ApprovalEngine::class);
        $request = $engine->submit(self::MODULE, $accountant, $student, 'Membership.');

        $engine->cancel($request, $accountant);

        $request->refresh();
        $this->assertSame('cancelled', $request->status);
        $this->assertNotNull($request->completed_at);
    }

    public function test_approved_flow_uses_custom_label_and_detail(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');
        $admin = $this->createUser($organization, 'admin');
        $plan = $this->seedLessonPlan($organization, $teacher);

        $engine = app(ApprovalEngine::class);
        $request = $engine->submit('lesson_plan', $teacher, $plan, 'Maths chapter 5.');

        $this->assertSame('pending', $request->status);

        $handler = app(\App\Services\Approvals\ApprovalModuleRegistry::class)->handlerFor('lesson_plan');
        $this->assertNotNull($handler);
        $detail = $handler->detail($request);
        $this->assertNotEmpty($detail);

        $engine->approve($request, $admin, 'Approved.');

        $plan->refresh();
        $this->assertSame('approved', $request->fresh()->status);
        $this->assertSame($admin->id, $plan->approved_by);
        $this->assertNotNull($plan->approved_at);
    }

    public function test_ensure_for_record_creates_request_for_legacy_records(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $plan = $this->seedLessonPlan($organization, $teacher);

        $engine = app(ApprovalEngine::class);
        $request = $engine->ensureForRecord('lesson_plan', $teacher, $plan, 'Legacy approval.');

        $this->assertSame($plan::class, $request->module_type);
        $this->assertSame($plan->id, $request->module_id);

        $engine->approve($request, $admin);
        $this->assertSame('approved', $request->fresh()->status);
    }

    public function test_action_center_and_submitted_endpoints(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $plan = $this->seedLessonPlan($organization, $teacher);

        app(ApprovalEngine::class)->submit('lesson_plan', $teacher, $plan, 'Draft approval.');

        $this->actingAs($admin)
            ->get('/approvals/action-center')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ApprovalActionCenter')
                ->has('requests', 1)
                ->where('requests.0.module', 'lesson_plan'));

        $this->actingAs($teacher)
            ->get('/approvals/submitted')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ApprovalSubmitted')
                ->has('requests', 1));

        $approvalId = ApprovalRequest::query()->firstOrFail()->id;
        $csrf = ['note' => 'Approved from inbox.'];
        $this->actingAs($admin)
            ->post("/approvals/{$approvalId}/approve", $csrf)
            ->assertRedirect();

        $plan->refresh();
        $this->assertSame($admin->id, $plan->approved_by);
        $this->assertSame('approved', ApprovalRequest::query()->firstOrFail()->status);
    }

    public function test_approval_flow_config_endpoints(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)
            ->get('/approvals')
            ->assertForbidden();

        $this->actingAs($admin)
            ->get('/approvals')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ApprovalFlows')
                ->has('flows', 3)
                ->has('flows.0.steps', 0));

        $this->actingAs($admin)
            ->post('/approvals/store', [
                'module' => 'lesson_plan',
                'name' => 'Lesson approval chain',
                'description' => 'Two step chain',
                'is_active' => 1,
            ])
            ->assertRedirect();

        $flow = ApprovalFlow::query()->where('organization_id', $organization->id)->where('module', 'lesson_plan')->firstOrFail();

        $this->actingAs($admin)
            ->post("/approvals/{$flow->id}/steps", [
                'steps' => [
                    ['actor_type' => 'role', 'actor_value' => 'admin', 'note' => 'Check one'],
                    ['actor_type' => 'user', 'actor_value' => (string) $teacher->id, 'note' => 'Check two'],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(2, ApprovalFlowStep::query()->where('approval_flow_id', $flow->id)->count());

        $this->actingAs($admin)
            ->patch("/approvals/{$flow->id}/toggle", ['is_active' => 0])
            ->assertRedirect();

        $this->assertFalse($flow->fresh()->is_active);
    }

    private function seedStudent(Organization $organization): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'APPROVE-'.$organization->id,
            'first_name' => 'Rohan',
            'last_name' => 'Mehta',
            'date_of_birth' => '2013-05-10',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
            'status' => 'active',
        ]);
    }

    private function seedLessonPlan(Organization $organization, User $teacher): LessonPlan
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '9',
            'section' => 'B',
            'status' => 'active',
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH-'.$organization->id,
            'type' => 'core',
        ]);

        $timetable = Timetable::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day' => strtolower(now()->format('l')),
            'start_time' => '09:00',
            'end_time' => '09:45',
            'room_number' => 'Room 202',
            'period_type' => 'lecture',
            'status' => 'active',
        ]);

        return LessonPlan::query()->create([
            'organization_id' => $organization->id,
            'timetable_id' => $timetable->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'lesson_date' => now()->toDateString(),
            'lesson_title' => 'Linear Equations',
            'topic' => 'Chapter 5',
            'status' => 'draft',
            'created_by' => $teacher->id,
            'updated_by' => $teacher->id,
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school-'.uniqid(),
            'email' => 'admin@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}