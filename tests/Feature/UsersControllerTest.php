<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsersControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_user_with_custom_role(): void
    {
        $organization = Organization::query()->create([
            'name' => 'Test School',
            'slug' => 'test-school',
            'email' => 'school@example.com',
        ]);

        Role::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Admin',
            'slug' => 'admin',
        ]);

        Role::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Counselor',
            'slug' => 'counselor',
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this
            ->withoutMiddleware()
            ->actingAs($admin)
            ->post('/staff', [
                'name' => 'Counselor One',
                'email' => 'counselor@example.com',
                'password' => 'password123',
                'role' => 'counselor',
                'status' => 'active',
            ]);

        $response->assertRedirect('/staff');

        $this->assertDatabaseHas('users', [
            'organization_id' => $organization->id,
            'email' => 'counselor@example.com',
            'role' => 'counselor',
            'status' => 'active',
        ]);
    }
}
