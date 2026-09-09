<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OnlinePaymentSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_online_payment_settings(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->get('/settings/online-payments')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard/OnlinePaymentSettings')
                ->has('onlinePaymentSettings')
                ->has('gatewayStatus', fn (Assert $status) => $status
                    ->where('enabled', false)
                    ->where('razorpayEnabled', true)
                    ->where('razorpayConfigured', false)
                    ->where('razorpayMode', null)
                    ->where('razorpayAvailable', false)
                    ->where('upiEnabled', true)
                    ->where('upiConfigured', false)
                    ->where('upiAvailable', false)));
    }

    public function test_admin_can_save_online_payment_settings(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)->patch('/settings/online-payments', [
            'enabled' => true,
            'razorpay_enabled' => true,
            'razorpay_key_id' => 'rzp_test_abc123',
            'razorpay_key_secret' => 'secret-key',
            'razorpay_currency' => 'INR',
            'upi_enabled' => true,
            'upi_id' => 'gurukul@ybl',
            'upi_holder_name' => 'Gurukul Trust',
        ])->assertRedirect()->assertSessionHas('success');

        $settings = $organization->fresh()->settings['online_payment'];
        $this->assertTrue((bool) $settings['enabled']);
        $this->assertSame('rzp_test_abc123', $settings['razorpay_key_id']);
        $this->assertSame('secret-key', Crypt::decryptString($settings['razorpay_key_secret']));
        $this->assertSame('gurukul@ybl', $settings['upi_id']);
    }

    public function test_check_reports_test_mode_for_sandbox_keys(): void
    {
        $organization = $this->configureRazorpay('rzp_test_sandbox123');
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->post('/settings/online-payments/test')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'enabled' => true,
                'razorpay' => true,
                'upi' => true,
                'razorpayMode' => 'test',
            ])
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'TEST'));
    }

    public function test_check_reports_live_mode_for_live_keys(): void
    {
        $organization = $this->configureRazorpay('rzp_live_live123');
        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->post('/settings/online-payments/test')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'razorpay' => true,
                'razorpayMode' => 'live',
            ]);
    }

    public function test_check_reports_disabled_when_master_switch_is_off(): void
    {
        $organization = $this->createOrganization();
        $organization->update([
            'settings' => [
                'online_payment' => [
                    'enabled' => false,
                    'razorpay_key_id' => 'rzp_test_abc',
                    'razorpay_key_secret' => Crypt::encryptString('secret'),
                ],
            ],
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->post('/settings/online-payments/test')
            ->assertOk()
            ->assertJson([
                'success' => false,
                'enabled' => false,
                'razorpay' => false,
            ])
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'disabled'));
    }

    public function test_check_reports_missing_gateway_when_nothing_configured(): void
    {
        $organization = $this->createOrganization();
        $organization->update([
            'settings' => [
                'online_payment' => [
                    'enabled' => true,
                    'razorpay_key_id' => '',
                ],
            ],
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->post('/settings/online-payments/test')
            ->assertOk()
            ->assertJson([
                'success' => false,
                'enabled' => true,
                'razorpay' => false,
                'upi' => false,
            ])
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'no gateway is configured'));
    }

    public function test_teacher_without_permission_cannot_access_settings(): void
    {
        $organization = $this->createOrganization();

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/settings/online-payments')->assertForbidden();
    }

    private function configureRazorpay(string $keyId): Organization
    {
        $organization = $this->createOrganization();
        $organization->update([
            'settings' => [
                'online_payment' => [
                    'enabled' => true,
                    'razorpay_enabled' => true,
                    'razorpay_key_id' => $keyId,
                    'razorpay_key_secret' => Crypt::encryptString('secret'),
                    'razorpay_currency' => 'INR',
                    'upi_enabled' => true,
                    'upi_id' => 'gurukul@ybl',
                    'upi_holder_name' => 'Gurukul Trust',
                ],
            ],
        ]);

        return $organization;
    }

    private function createAdmin(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $suffix = ''): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School' . ($suffix ? " {$suffix}" : ''),
            'slug' => 'gurukul-public-school' . ($suffix ? "-{$suffix}" : ''),
            'email' => ($suffix ? "{$suffix}-" : '') . 'admin@gurukul.test',
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