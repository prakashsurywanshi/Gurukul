<?php

namespace Tests\Feature;

use App\Models\GatePass;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GateTerminalFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_terminal_shows_todays_passes_and_summary(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->createPass($organization, $admin, 'exit', 'open');
        $this->createPass($organization, $admin, 'entry', 'closed');

        $this->actingAs($admin)
            ->get('/gate-passes/terminal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GateTerminal')
                ->has('passes', 2)
                ->where('summary.todayTotal', 2)
                ->where('summary.openCount', 1)
                ->where('summary.checkedToday', 1)
                ->where('passes.0.personName', 'Aarav Mehta')
            );
    }

    public function test_terminal_filters_open_passes_excluding_old_passes(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $yesterdayPass = GatePass::query()->create([
            'organization_id' => $organization->id,
            'person_type' => 'student',
            'person_name' => 'Old Pass',
            'pass_type' => 'exit',
            'reason' => 'Yesterday',
            'status' => 'open',
            'created_by_user_id' => $admin->id,
        ]);

        \Illuminate\Support\Facades\DB::table('gate_passes')
            ->where('id', $yesterdayPass->id)
            ->update(['created_at' => now()->subDay()]);

        $this->actingAs($admin)
            ->get('/gate-passes/terminal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.todayTotal', 0)
                ->has('passes', 0)
            );
    }

    public function test_terminal_rejects_roles_without_visitor_register(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)->get('/gate-passes/terminal')->assertForbidden();
    }

    public function test_receptionist_can_mark_used_from_terminal_queue(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $receptionist = $this->createUser($organization, 'receptionist');
        $pass = $this->createPass($organization, $receptionist, 'exit', 'open');

        $this->actingAs($receptionist)
            ->post("/gate-passes/{$pass->id}/used")
            ->assertRedirect();

        $this->assertSame('closed', $pass->fresh()->status);
        $this->assertNotNull($pass->fresh()->used_at);
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