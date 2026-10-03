<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffAttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_staff_attendance_for_a_date(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/staff-attendance?date='.now()->toDateString())
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.can_manage', true)
            ->assertJsonCount(2, 'data.staff');
    }

    public function test_admin_can_save_staff_attendance(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $date = now()->toDateString();

        $this->postJson('/api/staff-attendance', [
            'date' => $date,
            'entries' => [
                ['staff_id' => $teacher->id, 'status' => 'present'],
            ],
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('staff_attendance', [
            'organization_id' => $organization->id,
            'user_id' => $teacher->id,
            'date' => $date,
            'status' => 'present',
            'marked_by' => $admin->id,
        ]);
    }

    public function test_staff_attendance_is_tenant_scoped(): void
    {
        [, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [$otherOrganization] = $this->createOrganizationAndAdmin('beta-school', 'admin@beta.test');
        $otherTeacher = User::factory()->create([
            'organization_id' => $otherOrganization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/staff-attendance', [
            'date' => now()->toDateString(),
            'entries' => [
                ['staff_id' => $otherTeacher->id, 'status' => 'present'],
            ],
        ])->assertStatus(422);
    }

    public function test_teacher_cannot_save_staff_attendance(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        Sanctum::actingAs($teacher);

        $this->postJson('/api/staff-attendance', [
            'date' => now()->toDateString(),
            'entries' => [
                ['staff_id' => $admin->id, 'status' => 'present'],
            ],
        ])->assertForbidden();
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
