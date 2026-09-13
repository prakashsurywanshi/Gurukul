<?php

namespace Tests\Feature;

use App\Models\AppraisalCycle;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppraisalCycleFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_staff_appraisals_page_with_cycles(): void
    {
        [$organization, $admin] = $this->seedRole();
        AppraisalCycle::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-27 Annual',
            'starts_on' => '2026-04-01',
            'ends_on' => '2027-03-31',
            'status' => 'active',
            'description' => null,
        ]);

        $this->actingAs($admin)
            ->get('/staff/appraisals')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffAppraisals')
                ->has('cycles', 1)
                ->where('cycles.0.name', '2026-27 Annual')
                ->where('cycles.0.status', 'active'));
    }

    public function test_admin_can_create_appraisal_cycle(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->post('/staff/appraisals/cycles', [
                'name' => 'Mid-Term Review',
                'starts_on' => '2026-01-01',
                'ends_on' => '2026-06-30',
                'status' => 'active',
                'description' => 'Half yearly review cycle.',
            ])
            ->assertSessionDoesntHaveErrors();

        $cycle = AppraisalCycle::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($cycle);
        $this->assertSame('Mid-Term Review', $cycle->name);
        $this->assertSame('2026-01-01', $cycle->starts_on->toDateString());
        $this->assertSame('active', $cycle->status);
    }

    public function test_admin_can_update_appraisal_cycle(): void
    {
        [$organization, $admin] = $this->seedRole();
        $cycle = AppraisalCycle::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Old Cycle',
            'starts_on' => '2026-01-01',
            'ends_on' => '2026-06-30',
            'status' => 'active',
            'description' => null,
        ]);

        $this->actingAs($admin)
            ->put("/staff/appraisals/cycles/{$cycle->id}", [
                'name' => 'Renamed Cycle',
                'starts_on' => '2026-01-01',
                'ends_on' => '2026-12-31',
                'status' => 'completed',
                'description' => 'Extended and closed.',
            ])
            ->assertSessionDoesntHaveErrors();

        $cycle->refresh();
        $this->assertSame('Renamed Cycle', $cycle->name);
        $this->assertSame('2026-12-31', $cycle->ends_on->toDateString());
        $this->assertSame('completed', $cycle->status);
    }

    public function test_admin_can_delete_appraisal_cycle(): void
    {
        [$organization, $admin] = $this->seedRole();
        $cycle = AppraisalCycle::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Legacy Cycle',
            'starts_on' => '2025-04-01',
            'ends_on' => '2026-03-31',
            'status' => 'completed',
            'description' => null,
        ]);

        $this->actingAs($admin)->delete("/staff/appraisals/cycles/{$cycle->id}");

        $this->assertDatabaseMissing('appraisal_cycles', ['id' => $cycle->id]);
    }

    public function test_cycle_end_must_follow_start(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->post('/staff/appraisals/cycles', [
                'name' => 'Backwards Cycle',
                'starts_on' => '2026-06-01',
                'ends_on' => '2026-01-01',
                'status' => 'active',
            ])
            ->assertSessionHasErrors('ends_on');

        $this->assertDatabaseCount('appraisal_cycles', 0);
    }

    public function test_cannot_modify_cycle_from_another_organization(): void
    {
        [$organization, $admin] = $this->seedRole();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($other);
        $foreign = AppraisalCycle::query()->create([
            'organization_id' => $other->id,
            'name' => 'Foreign Cycle',
            'starts_on' => '2026-01-01',
            'ends_on' => '2026-06-30',
            'status' => 'active',
            'description' => null,
        ]);

        $this->actingAs($admin)
            ->put("/staff/appraisals/cycles/{$foreign->id}", [
                'name' => 'Hacked',
                'starts_on' => '2026-01-01',
                'ends_on' => '2026-06-30',
                'status' => 'active',
            ])
            ->assertNotFound();
        $this->actingAs($admin)->delete("/staff/appraisals/cycles/{$foreign->id}")->assertNotFound();

        $this->assertDatabaseHas('appraisal_cycles', ['id' => $foreign->id, 'name' => 'Foreign Cycle']);
    }

    public function test_teacher_is_forbidden_from_cycle_mutations(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->post('/staff/appraisals/cycles', [
            'name' => 'Sneaky',
            'starts_on' => '2026-01-01',
            'ends_on' => '2026-06-30',
            'status' => 'active',
        ])->assertForbidden();

        $this->assertDatabaseCount('appraisal_cycles', 0);
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
            'name' => 'Cycle School '.$counter,
            'slug' => 'cycle-school-'.$counter,
            'email' => 'cycle-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Nagpur',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '440001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}