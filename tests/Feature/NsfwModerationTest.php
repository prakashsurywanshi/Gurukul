<?php

namespace Tests\Feature;

use App\Models\ContentFlag;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NsfwModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_content_safety_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $this->createFlag($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/nsfw')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/NsfwModeration')
                ->has('flags', 1)
                ->where('stats.pending', 1)
                ->where('filters.status', '')
            );
    }

    public function test_admin_filter_by_status(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $this->createFlag($organization, 'reviewed');

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/nsfw?status=reviewed')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('flags.0.status', 'reviewed')
                ->where('filters.status', 'reviewed')
            );
    }

    public function test_admin_can_review_flag(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $flag = $this->createFlag($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->from('/nsfw')
            ->post("/nsfw/{$flag->id}/review", ['action' => 'reviewed'])
            ->assertRedirect('/nsfw');

        $flag->refresh();
        $this->assertSame('reviewed', $flag->status);
        $this->assertSame($admin->id, $flag->reviewed_by);
        $this->assertNotNull($flag->reviewed_at);
    }

    public function test_admin_can_dismiss_flag(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $flag = $this->createFlag($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post("/nsfw/{$flag->id}/review", ['action' => 'dismissed'])
            ->assertRedirect();

        $flag->refresh();
        $this->assertSame('dismissed', $flag->status);
    }

    public function test_admin_can_report_content(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/nsfw', [
                'item_type' => 'gallery',
                'item_id' => 42,
                'reason' => 'Inappropriate content',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('content_flags', [
            'organization_id' => $organization->id,
            'item_type' => 'gallery',
            'item_id' => 42,
            'status' => 'pending',
        ]);
    }

    public function test_teacher_cannot_access_content_safety(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)->get('/nsfw')->assertForbidden();
    }

    public function test_flag_cannot_be_reviewed_across_organizations(): void
    {
        $orgA = $this->createOrganization('school-a', 'a@example.com');
        $orgB = $this->createOrganization('school-b', 'b@example.com');
        app(StaffPermissionService::class)->ensureRolesExist($orgA);
        app(StaffPermissionService::class)->ensureRolesExist($orgB);

        $flag = $this->createFlag($orgA);
        $adminB = $this->createUser($orgB, 'admin');

        $this->actingAs($adminB)
            ->post("/nsfw/{$flag->id}/review", ['action' => 'reviewed'])
            ->assertForbidden();
    }

    private function createFlag(Organization $organization, string $status = 'pending'): ContentFlag
    {
        return ContentFlag::query()->create([
            'organization_id' => $organization->id,
            'flagged_by' => null,
            'item_type' => 'gallery',
            'item_id' => 10,
            'reason' => 'Inappropriate content',
            'status' => $status,
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