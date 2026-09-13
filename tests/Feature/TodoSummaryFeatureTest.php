<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Todo;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TodoSummaryFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_insight_counts(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        Todo::query()->create([
            'user_id' => $admin->id,
            'organization_id' => $organization->id,
            'title' => 'Overdue & high',
            'due_date' => Carbon::today()->subDays(1)->toDateString(),
            'priority' => 'High',
            'completed' => false,
        ]);

        Todo::query()->create([
            'user_id' => $admin->id,
            'organization_id' => $organization->id,
            'title' => 'Due today medium',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Medium',
            'completed' => false,
        ]);

        Todo::query()->create([
            'user_id' => $admin->id,
            'organization_id' => $organization->id,
            'title' => 'Done task',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Low',
            'completed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson('/todo/summary')
            ->assertOk()
            ->assertJson([
                'total' => 3,
                'active' => 2,
                'completed' => 1,
                'dueToday' => 1,
                'overdue' => 1,
                'highPriority' => 1,
            ])
            ->assertJsonCount(2, 'upcoming')
            ->assertJsonPath('upcoming.0.title', 'Overdue & high')
            ->assertJsonPath('upcoming.1.title', 'Due today medium')
            ->assertJsonPath('upcoming.1.priority', 'Medium');
    }

    public function test_summary_is_scoped_to_current_user(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $colleague = $this->createUser($organization, 'teacher');

        Todo::query()->create([
            'user_id' => $admin->id,
            'organization_id' => $organization->id,
            'title' => 'Mine',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Low',
            'completed' => false,
        ]);

        Todo::query()->create([
            'user_id' => $colleague->id,
            'organization_id' => $organization->id,
            'title' => 'Theirs',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Low',
            'completed' => false,
        ]);

        $this->actingAs($admin)
            ->getJson('/todo/summary')
            ->assertOk()
            ->assertJson([
                'total' => 1,
                'active' => 1,
                'upcoming' => [
                    ['title' => 'Mine'],
                ],
            ]);
    }

    public function test_permissionless_role_cannot_view_summary(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $student = $this->createUser($organization, 'student');

        $this->actingAs($student)
            ->getJson('/todo/summary')
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