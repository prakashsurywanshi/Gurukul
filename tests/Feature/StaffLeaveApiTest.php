<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffLeaveApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_leave_requests_and_balances(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'student_id' => null,
            'leave_type' => 'casual',
            'from_date' => now()->toDateString(),
            'to_date' => now()->addDays(1)->toDateString(),
            'total_days' => 2,
            'reason' => 'Family function',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/staff-leave')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.can_manage', true)
            ->assertJsonCount(1, 'data.requests')
            ->assertJsonPath('data.requests.0.staff_id', $teacher->id)
            ->assertJsonPath('data.requests.0.type', 'casual')
            ->assertJsonCount(2, 'data.staff')
            ->assertJsonCount(2, 'data.balances');
    }

    public function test_admin_can_create_leave_request(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        Sanctum::actingAs($admin);

        $this->postJson('/api/staff-leave', [
            'staff_id' => $teacher->id,
            'leave_type' => 'sick',
            'from_date' => now()->toDateString(),
            'to_date' => now()->addDays(1)->toDateString(),
            'reason' => 'Fever',
        ])->assertCreated()->assertJsonPath('success', true);

        $this->assertDatabaseHas('leave_requests', [
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'leave_type' => 'sick',
            'student_id' => null,
            'total_days' => 2,
            'status' => 'pending',
        ]);
    }

    public function test_leave_request_is_rejected_when_balance_is_insufficient(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        Sanctum::actingAs($admin);

        $this->postJson('/api/staff-leave', [
            'staff_id' => $teacher->id,
            'leave_type' => 'casual',
            'from_date' => now()->toDateString(),
            'to_date' => now()->addDays(30)->toDateString(),
            'reason' => 'Extended break',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_admin_can_approve_leave_request(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        $leaveRequest = LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'student_id' => null,
            'leave_type' => 'casual',
            'from_date' => now()->toDateString(),
            'to_date' => now()->toDateString(),
            'total_days' => 1,
            'reason' => 'Personal',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/staff-leave/{$leaveRequest->id}/status", [
            'status' => 'approved',
            'admin_remarks' => 'Approved.',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'status' => 'approved',
            'approved_by' => $admin->id,
        ]);
    }

    public function test_leave_request_is_tenant_scoped(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        $leaveRequest = LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'student_id' => null,
            'leave_type' => 'casual',
            'from_date' => now()->toDateString(),
            'to_date' => now()->toDateString(),
            'total_days' => 1,
            'reason' => 'Personal',
            'status' => 'pending',
        ]);

        [, $otherAdmin] = $this->createOrganizationAndAdmin('beta-school', 'admin@beta.test');

        Sanctum::actingAs($otherAdmin);

        $this->patchJson("/api/staff-leave/{$leaveRequest->id}/status", [
            'status' => 'approved',
        ])->assertNotFound();
    }

    public function test_teacher_cannot_list_leave_requests(): void
    {
        [$organization] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = $this->createTeacher($organization);

        Sanctum::actingAs($teacher);

        $this->getJson('/api/staff-leave')->assertForbidden();
    }

    private function createTeacher(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
    }

    private function createOrganizationAndAdmin(string $slug, string $email): array
    {
        $organization = Organization::query()->create([
            'name' => ucfirst(explode('-', $slug)[0]).' School',
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
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
            'email' => $email,
        ]);

        return [$organization, $admin];
    }
}
