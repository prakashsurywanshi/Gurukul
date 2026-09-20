<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SuperAdminSetting;
use App\Models\User;
use App\Services\IntegrationKeyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminIntegrationKeysTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_integration_keys_page(): void
    {
        $superAdmin = $this->createSuperAdmin();

        $this->actingAs($superAdmin)
            ->get('/superadmin/integration-keys')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('superAdminView', 'integration-keys')
                ->where('integrationKeys.biometric_sync_key', '')
            );
    }

    public function test_super_admin_can_update_integration_keys(): void
    {
        $superAdmin = $this->createSuperAdmin();

        $this->actingAs($superAdmin)
            ->patch('/superadmin/integration-keys', [
                'biometric_sync_key' => 'bio-db-key',
                'cctv_sync_key' => '',
                'transport_gps_sync_key' => 'gps-db-key',
            ])
            ->assertRedirect('/superadmin/integration-keys')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('super_admin_settings', ['id' => 1]);
        $this->assertSame('bio-db-key', SuperAdminSetting::query()->first()->biometric_sync_key);
        $this->assertSame('gps-db-key', SuperAdminSetting::query()->first()->transport_gps_sync_key);
    }

    public function test_non_super_admin_cannot_update_integration_keys(): void
    {
        $organization = Organization::query()->create([
            'name' => 'Keys School',
            'slug' => 'keys-school',
            'email' => 'keys@example.com',
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'organization_id' => $organization->id,
        ]);

        $this->actingAs($admin)
            ->patch('/superadmin/integration-keys', ['biometric_sync_key' => 'nope'])
            ->assertForbidden();
    }

    public function test_stored_database_key_takes_precedence_over_env_default(): void
    {
        config(['sync.keys.biometric' => 'env-key']);
        config(['sync.keys.cctv' => 'env-cctv']);
        config(['sync.keys.transport_gps' => 'env-gps']);

        SuperAdminSetting::query()->first()->forceFill([
            'biometric_sync_key' => 'db-key',
            'transport_gps_sync_key' => 'db-gps',
        ])->save();

        $service = app(IntegrationKeyService::class);

        $this->assertSame('db-key', $service->globalKey('biometric'));
        $this->assertSame('db-gps', $service->globalKey('transport_gps'));
        $this->assertSame('env-cctv', $service->globalKey('cctv'));
        $this->assertTrue($service->hasGlobalKey('biometric'));
    }

    private function createSuperAdmin(): User
    {
        return User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }
}