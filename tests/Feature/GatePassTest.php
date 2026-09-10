<?php

namespace Tests\Feature;

use App\Models\GatePass;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GatePassTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_gate_passes_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $this->createPass($organization, $admin, 'exit', 'open');

        $this->actingAs($admin)
            ->get('/gate-passes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GatePasses')
                ->has('passes', 1)
                ->where('passes.0.personName', 'Aarav Mehta')
                ->where('passes.0.passType', 'exit')
                ->where('openCount', 1)
            );
    }

    public function test_admin_can_issue_student_exit_pass(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post('/gate-passes', [
                'person_type' => 'student',
                'student_id' => $student->id,
                'pass_type' => 'exit',
                'reason' => 'Doctor appointment',
                'expected_return_at' => '2026-09-10T16:00',
            ])
            ->assertRedirect();

        $pass = GatePass::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($pass);
        $this->assertSame('student', $pass->person_type);
        $this->assertSame($student->id, $pass->student_id);
        $this->assertSame('Aarav Mehta', $pass->person_name);
        $this->assertSame('exit', $pass->pass_type);
        $this->assertSame('open', $pass->status);
        $this->assertSame($admin->id, $pass->created_by_user_id);
    }

    public function test_admin_can_issue_staff_entry_pass(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/gate-passes', [
                'person_type' => 'staff',
                'staff_user_id' => $teacher->id,
                'pass_type' => 'entry',
                'reason' => 'Weekend library work',
            ])
            ->assertRedirect();

        $pass = GatePass::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($pass);
        $this->assertSame($teacher->id, $pass->staff_user_id);
        $this->assertSame($teacher->name, $pass->person_name);
        $this->assertSame('entry', $pass->pass_type);
    }

    public function test_pass_requires_valid_reason_and_person(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/gate-passes', [
                'person_type' => 'student',
                'pass_type' => 'exit',
                'reason' => '',
            ])
            ->assertSessionHasErrors(['student_id', 'reason']);
    }

    public function test_admin_can_mark_pass_used_at_terminal(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $pass = $this->createPass($organization, $admin, 'exit', 'open');

        $this->actingAs($admin)
            ->post("/gate-passes/{$pass->id}/used")
            ->assertRedirect();

        $fresh = $pass->fresh();
        $this->assertSame('closed', $fresh->status);
        $this->assertNotNull($fresh->used_at);
    }

    public function test_admin_can_cancel_open_pass(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $pass = $this->createPass($organization, $admin, 'exit', 'open');

        $this->actingAs($admin)
            ->post("/gate-passes/{$pass->id}/cancel")
            ->assertRedirect();

        $this->assertSame('cancelled', $pass->fresh()->status);
    }

    public function test_closed_pass_cannot_be_reused(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $pass = $this->createPass($organization, $admin, 'exit', 'closed');

        $this->actingAs($admin)
            ->post("/gate-passes/{$pass->id}/used")
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame('closed', $pass->fresh()->status);
    }

    public function test_cross_organization_pass_returns_404(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($other, 'admin');
        $pass = $this->createPass($organization, $admin, 'exit', 'open');

        $this->actingAs($otherAdmin)
            ->post("/gate-passes/{$pass->id}/cancel")
            ->assertNotFound();
    }

    private function createPass(Organization $organization, User $issuedBy, string $passType, string $status): GatePass
    {
        return GatePass::query()->create([
            'organization_id' => $organization->id,
            'person_type' => 'student',
            'person_name' => 'Aarav Mehta',
            'person_contact' => '9876543210',
            'pass_type' => $passType,
            'reason' => 'Doctor appointment',
            'status' => $status,
            'created_by_user_id' => $issuedBy->id,
        ]);
    }

    private function createStudent(Organization $organization): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-1001',
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
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

    private function createOrganization(string $slug = 'gurukul-public-school', string $email = 'admin@gurukul.test'): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => $slug,
            'email' => $email,
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