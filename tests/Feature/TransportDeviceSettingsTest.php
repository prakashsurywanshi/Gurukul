<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportDeviceSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_requires_permission(): void
    {
        $owner = User::factory()->create(['role' => 'owner', 'organization_id' => $this->organization()->id]);

        $this->actingAs($owner)->get('/transport/device-settings')->assertForbidden();
    }

    public function test_admin_sees_settings_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $this->organization()->id]);

        $this->actingAs($admin)->get('/transport/device-settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/TransportDeviceSettings'));
    }

    public function test_admin_regenerates_key_stored_per_organization(): void
    {
        $org = $this->organization();
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $this->actingAs($admin)->post('/transport/device-settings/regenerate')->assertRedirect();

        $org->refresh();
        $this->assertNotEmpty($org->settings['transport']['sync_key'] ?? '');
        $this->assertSame(32, strlen((string) ($org->settings['transport']['sync_key'] ?? '')));
    }

    public function test_reveal_returns_key(): void
    {
        $org = $this->organization();
        $org->settings = array_replace_recursive($org->settings ?? [], ['transport' => ['sync_key' => 'secret-key-abc']]);
        $org->save();
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $this->actingAs($admin)->getJson('/transport/device-settings/reveal')
            ->assertOk()
            ->assertJsonPath('key', 'secret-key-abc');
    }

    private function organization(): Organization
    {
        if ($org = Organization::first()) {
            return $org;
        }

        return Organization::create([
            'name' => 'Preview School',
            'slug' => 'preview-school',
            'email' => 'preview-school@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);
    }
}