<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\User;
use App\Services\LeaveBalanceService;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffLeaveBalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_leave_management_page_exposes_leave_balances(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/staff/leave-management')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffLeaveManagement')
                ->has('leaveBalances', 1)
                ->has('leaveTypes')
                ->where('leaveYear', now()->year)
                ->has('leaveBalances.0.balances', 5)
            );
    }

    public function test_leave_balance_service_uses_default_entitlements(): void
    {
        $organization = $this->createOrganization();
        $staff = $this->createUser($organization, 'teacher');

        $service = app(LeaveBalanceService::class);

        $this->assertSame(12.0, $service->entitledDays($organization, $staff->id, 'casual', now()->year));
        $this->assertSame(24.0, $service->entitledDays($organization, $staff->id, 'vacation', now()->year));
        $this->assertTrue($service->canTake($organization, $staff->id, 'casual', now()->year, 5));
        $this->assertFalse($service->canTake($organization, $staff->id, 'casual', now()->year, 13));
    }

    public function test_admin_can_create_leave_within_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/staff/leave-management', [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(4)->format('Y-m-d'),
                'reason' => 'Family function',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('leave_requests', [
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'leave_type' => 'casual',
            'total_days' => 5,
        ]);

        $this->assertSame(
            5.0,
            (float) LeaveRequest::query()
                ->where('organization_id', $organization->id)
                ->where('user_id', $staff->id)
                ->where('leave_type', 'casual')
                ->whereIn('status', ['approved', 'pending'])
                ->sum('total_days')
        );
    }

    public function test_admin_cannot_create_leave_exceeding_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/staff/leave-management', [
                'staff_id' => $staff->id,
                'leave_type' => 'vacation',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(29)->format('Y-m-d'),
                'reason' => 'Long break',
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseCount('leave_requests', 0);
    }

    public function test_admin_cannot_update_leave_beyond_remaining_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $first = $this->createLeave($organization, $staff, 'casual', 10);
        $first->update(['status' => 'approved']);

        $second = $this->actingAs($admin)
            ->post('/staff/leave-management', [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->format('Y-m-d'),
                'reason' => 'Second leave within balance',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $latest = LeaveRequest::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $staff->id)
            ->where('id', '!=', $first->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($latest);
        $this->assertSame(1, (int) $latest->total_days);

        $this->actingAs($admin)
            ->patch("/staff/leave-management/{$latest->id}", [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(4)->format('Y-m-d'),
                'reason' => 'Too long now',
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(1, (int) $latest->fresh()->total_days);
    }

    public function test_admin_can_update_leave_within_remaining_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $first = $this->createLeave($organization, $staff, 'casual', 8);
        $first->update(['status' => 'approved']);

        $second = $this->createLeave($organization, $staff, 'casual', 2);

        $this->actingAs($admin)
            ->patch("/staff/leave-management/{$second->id}", [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(2)->format('Y-m-d'),
                'reason' => 'Adjusted within balance',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(3, (int) $second->fresh()->total_days);
    }

    public function test_admin_can_adjust_entitlement_and_unlocks_leave(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/staff/leave-management/balances', [
                'year' => now()->year,
                'entries' => [
                    [
                        'staffId' => $staff->id,
                        'leaveType' => 'casual',
                        'entitledDays' => 20,
                    ],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('staff_leave_balances', [
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'leave_type' => 'casual',
            'year' => now()->year,
            'entitled_days' => 20,
        ]);

        $this->actingAs($admin)
            ->post('/staff/leave-management', [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(14)->format('Y-m-d'),
                'reason' => 'Now within entitlement',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    public function test_staff_can_submit_own_leave_within_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($staff)
            ->post('/my-leaves', [
                'leave_type' => 'sick',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->format('Y-m-d'),
                'reason' => 'Not feeling well',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    public function test_staff_cannot_submit_own_leave_exceeding_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $staff = $this->createUser($organization, 'teacher');

        $this->actingAs($staff)
            ->post('/my-leaves', [
                'leave_type' => 'sick',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(19)->format('Y-m-d'),
                'reason' => 'Longer than allowed',
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseCount('leave_requests', 0);
    }

    private function createLeave(Organization $organization, User $staff, string $type, int $days): LeaveRequest
    {
        return LeaveRequest::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
            'student_id' => null,
            'leave_type' => $type,
            'from_date' => now()->format('Y-m-d'),
            'to_date' => now()->addDays($days - 1)->format('Y-m-d'),
            'total_days' => $days,
            'reason' => 'Auto seeded leave request',
            'status' => 'pending',
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
            'slug' => 'gurukul-public-school',
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