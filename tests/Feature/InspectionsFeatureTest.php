<?php

namespace Tests\Feature;

use App\Models\Inspection;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InspectionsFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_lists_inspections(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        Inspection::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Annual audit',
            'inspector_name' => 'Mr. Sharma',
            'inspection_type' => 'compliance',
            'scheduled_date' => '2026-08-10',
            'status' => 'planned',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/inspections')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Inspections')
                ->has('inspections', 1)
                ->where('inspections.0.title', 'Annual audit')
                ->where('inspections.0.status', 'planned'));
    }

    public function test_store_creates_inspection(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $this->actingAs($admin)
            ->from('/inspections')
            ->post('/inspections', [
                'title' => 'Fire safety check',
                'inspector_name' => 'Fire Dept',
                'inspection_type' => 'safety',
                'scheduled_date' => '2026-08-15',
                'status' => 'planned',
                'score' => null,
                'findings' => 'Check extinguishers',
            ])
            ->assertRedirect('/inspections')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('inspections', [
            'organization_id' => $organization->id,
            'title' => 'Fire safety check',
            'inspection_type' => 'safety',
            'status' => 'planned',
        ]);
    }

    public function test_store_validates_type(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $this->actingAs($admin)
            ->from('/inspections')
            ->post('/inspections', [
                'title' => 'Bad type',
                'inspection_type' => 'nonsense',
                'status' => 'planned',
            ])
            ->assertRedirect('/inspections')
            ->assertSessionHasErrors(['inspection_type']);

        $this->assertDatabaseCount('inspections', 0);
    }

    public function test_completing_inspection_sets_completed_at(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $inspection = Inspection::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Health visit',
            'inspection_type' => 'health',
            'status' => 'in_progress',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/inspections/{$inspection->id}", [
                'title' => 'Health visit',
                'inspection_type' => 'health',
                'status' => 'completed',
                'score' => 9,
                'findings' => 'All good',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $updated = $inspection->fresh();
        $this->assertEquals('completed', $updated->status);
        $this->assertEquals(9, $updated->score);
        $this->assertNotNull($updated->completed_at);
    }

    public function test_update_to_cancelled_clears_completed_at(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $inspection = Inspection::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Visit',
            'inspection_type' => 'facility',
            'status' => 'completed',
            'completed_at' => now(),
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/inspections/{$inspection->id}", [
                'title' => 'Visit',
                'inspection_type' => 'facility',
                'status' => 'cancelled',
            ])
            ->assertRedirect();

        $this->assertNull($inspection->fresh()->completed_at);
    }

    public function test_destroy_deletes_inspection(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $inspection = Inspection::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Temp check',
            'inspection_type' => 'academic',
            'status' => 'planned',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->delete("/inspections/{$inspection->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('inspections', ['id' => $inspection->id]);
    }

    public function test_teacher_cannot_access_inspections(): void
    {
        [$organization] = $this->seedOrganization();
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/inspections')
            ->assertForbidden();
    }

    public function test_cannot_modify_other_organizations_inspection(): void
    {
        [$organization] = $this->seedOrganization();
        $other = Organization::query()->create([
            'name' => 'Other School',
            'slug' => 'other-school',
            'email' => 'other@gurukul.test',
            'phone' => '8888888888',
            'address' => 'Another Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 500,
            'max_staff' => 50,
            'settings' => [],
        ]);

        $foreign = Inspection::query()->create([
            'organization_id' => $other->id,
            'title' => 'Foreign audit',
            'inspection_type' => 'compliance',
            'status' => 'planned',
            'created_by' => $this->createAdmin($other)->id,
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->patch("/inspections/{$foreign->id}", [
                'title' => 'Hacked',
                'inspection_type' => 'compliance',
                'status' => 'cancelled',
            ])
            ->assertForbidden();

        $this->actingAs($admin)
            ->delete("/inspections/{$foreign->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('inspections', ['id' => $foreign->id, 'title' => 'Foreign audit']);
    }

    private function seedOrganization(): array
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        return [$organization, $admin];
    }

    private function createAdmin(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
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