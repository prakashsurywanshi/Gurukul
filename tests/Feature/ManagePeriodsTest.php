<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\TimeSlot;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagePeriodsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_manage_periods_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $this->createSlot($organization, 'Period 1', '08:00:00', '08:40:00', 'period', 1);

        $this->actingAs($admin)
            ->get('/time-slots')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ManagePeriods')
                ->has('slots', 1)
                ->where('slots.0.name', 'Period 1')
                ->where('slots.0.slotType', 'period')
                ->where('slots.0.sortOrder', 1)
            );
    }

    public function test_admin_can_add_time_slot(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/time-slots', [
                'name' => 'Period 1',
                'start_time' => '08:00',
                'end_time' => '08:40',
                'slot_type' => 'period',
            ])
            ->assertRedirect();

        $slot = TimeSlot::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($slot);
        $this->assertSame('08:00:00', $slot->start_time);
        $this->assertSame(1, $slot->sort_order);
    }

    public function test_admin_can_add_break_and_keep_order(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $this->createSlot($organization, 'Period 1', '08:00:00', '08:40:00', 'period', 1);

        $this->actingAs($admin)
            ->post('/time-slots', [
                'name' => 'Break',
                'start_time' => '10:00',
                'end_time' => '10:20',
                'slot_type' => 'break',
            ])
            ->assertRedirect();

        $this->assertSame(2, TimeSlot::query()->where('organization_id', $organization->id)->max('sort_order'));
        $this->assertSame('break', TimeSlot::query()->where('name', 'Break')->first()->slot_type);
    }

    public function test_admin_can_update_time_slot(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $slot = $this->createSlot($organization, 'Period 1', '08:00:00', '08:40:00', 'period', 1);

        $this->actingAs($admin)
            ->put("/time-slots/{$slot->id}", [
                'name' => 'Period 1A',
                'start_time' => '08:10',
                'end_time' => '08:50',
                'slot_type' => 'period',
            ])
            ->assertRedirect();

        $fresh = $slot->fresh();
        $this->assertSame('Period 1A', $fresh->name);
        $this->assertSame('08:10:00', $fresh->start_time);
        $this->assertSame('08:50:00', $fresh->end_time);
    }

    public function test_admin_can_reorder_time_slots(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $first = $this->createSlot($organization, 'Period 1', '08:00:00', '08:40:00', 'period', 1);
        $second = $this->createSlot($organization, 'Period 2', '08:40:00', '09:20:00', 'period', 2);

        $this->actingAs($admin)
            ->post('/time-slots/reorder', ['order' => [$second->id, $first->id]])
            ->assertRedirect();

        $this->assertSame(1, $second->fresh()->sort_order);
        $this->assertSame(2, $first->fresh()->sort_order);
    }

    public function test_admin_can_delete_time_slot(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $slot = $this->createSlot($organization, 'Period 1', '08:00:00', '08:40:00', 'period', 1);

        $this->actingAs($admin)
            ->delete("/time-slots/{$slot->id}")
            ->assertRedirect();

        $this->assertNull(TimeSlot::query()->find($slot->id));
    }

    public function test_receptionist_cannot_access_manage_periods(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/time-slots')
            ->assertForbidden();
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

    private function createSlot(
        Organization $organization,
        string $name,
        string $startTime,
        string $endTime,
        string $slotType,
        int $sortOrder
    ): TimeSlot {
        return TimeSlot::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'slot_type' => $slotType,
            'sort_order' => $sortOrder,
        ]);
    }
}