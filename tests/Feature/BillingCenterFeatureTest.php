<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingCenterFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_view_billing_center_with_kpis_orgs_and_payments(): void
    {
        $superAdmin = $this->createSuperAdmin();

        $organization = $this->createOrganization([
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonths(2)->toDateString(),
        ]);

        User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        SubscriptionPayment::query()->create([
            'organization_id' => $organization->id,
            'amount' => 4999,
            'plan_name' => 'Premium Annual',
            'transaction_id' => 'txn_bc_1',
            'payment_method' => 'upi',
            'status' => 'completed',
            'payment_date' => now()->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->get('/billing-center')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/BillingCenter')
                ->where('kpis.totalOrgs', 1)
                ->where('kpis.activeOrgs', 1)
                ->where('kpis.expiringSoon', 0)
                ->where('kpis.expiredOrgs', 0)
                ->where('kpis.paymentCount', 1)
                ->where('kpis.monthCollected', fn ($value) => (float) $value === 4999.0)
                ->has('organizations', 1)
                ->where('organizations.0.name', 'Gurukul Public School')
                ->where('organizations.0.plan', 'premium')
                ->where('organizations.0.status', 'active')
                ->where('organizations.0.activeAccess', true)
                ->where('organizations.0.isExpired', false)
                ->where('organizations.0.daysRemaining', fn ($value) => $value >= 59 && $value <= 62)
                ->has('payments', 1)
                ->where('payments.0.organization_name', 'Gurukul Public School')
                ->where('payments.0.transaction_id', 'txn_bc_1')
                ->where('payments.0.status', 'completed')
                ->where('expiringSoon', [])
            );
    }

    public function test_expiring_soon_and_expired_kpis_are_computed(): void
    {
        $superAdmin = $this->createSuperAdmin();

        $this->createOrganization([
            'name' => 'Expiring School',
            'slug' => 'expiring-school',
            'email' => 'expiring@gurukul.test',
            'subscription_end_date' => now()->addDays(10)->toDateString(),
        ]);
        $this->createOrganization([
            'name' => 'Expired School',
            'slug' => 'expired-school',
            'email' => 'expired@gurukul.test',
            'subscription_end_date' => now()->subDays(3)->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->get('/billing-center')
            ->assertInertia(fn ($page) => $page
                ->where('kpis.totalOrgs', 2)
                ->where('kpis.activeOrgs', 1)
                ->where('kpis.expiringSoon', 1)
                ->where('kpis.expiredOrgs', 1)
                ->has('expiringSoon', 1)
                ->where('expiringSoon.0.name', 'Expiring School')
                ->where('expiringSoon.0.daysRemaining', 10)
            );
    }

    public function test_non_superadmin_cannot_access_billing_center(): void
    {
        $organization = $this->createOrganization();
        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/billing-center')
            ->assertForbidden();

        $this->actingAs($admin)
            ->post("/billing-center/organizations/{$organization->id}/payments", [
                'amount' => 1000,
                'plan_name' => 'Premium',
                'payment_method' => 'cash',
                'payment_date' => now()->toDateString(),
            ])
            ->assertForbidden();
    }

    public function test_recording_a_payment_creates_record_and_renews_subscription(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization([
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->from('/billing-center')
            ->post("/billing-center/organizations/{$organization->id}/payments", [
                'amount' => 9999,
                'plan_name' => 'Premium Annual',
                'transaction_id' => 'txn_renew_1',
                'payment_method' => 'bank_transfer',
                'payment_date' => now()->toDateString(),
                'renew_months' => 12,
                'notes' => 'Annual renewal',
            ])
            ->assertRedirect('/billing-center')
            ->assertSessionHas('success', "Payment recorded for {$organization->name}.");

        $this->assertDatabaseHas('subscription_payments', [
            'organization_id' => $organization->id,
            'amount' => 9999,
            'plan_name' => 'Premium Annual',
            'transaction_id' => 'txn_renew_1',
            'payment_method' => 'bank_transfer',
            'status' => 'completed',
            'notes' => 'Annual renewal',
        ]);

        $organization->refresh();
        $this->assertSame(
            now()->addMonths(13)->toDateString(),
            $organization->subscription_end_date?->toDateString()
        );
    }

    public function test_renewal_after_expiry_counts_from_today(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization([
            'subscription_end_date' => now()->subDays(2)->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->from('/billing-center')
            ->post("/billing-center/organizations/{$organization->id}/payments", [
                'amount' => 5000,
                'plan_name' => 'Premium',
                'payment_method' => 'cash',
                'payment_date' => now()->toDateString(),
                'renew_months' => 3,
            ])
            ->assertRedirect('/billing-center');

        $organization->refresh();
        $this->assertSame(
            now()->addMonths(3)->toDateString(),
            $organization->subscription_end_date?->toDateString()
        );
    }

    public function test_payment_without_renewal_keeps_subscription_untouched(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization([
            'subscription_end_date' => now()->addMonth()->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->from('/billing-center')
            ->post("/billing-center/organizations/{$organization->id}/payments", [
                'amount' => 2500,
                'plan_name' => 'Basic',
                'payment_method' => 'upi',
                'payment_date' => now()->toDateString(),
                'renew_months' => null,
            ])
            ->assertRedirect('/billing-center');

        $organization->refresh();
        $this->assertSame(
            now()->addMonth()->toDateString(),
            $organization->subscription_end_date?->toDateString()
        );
    }

    public function test_payment_validation_rejects_zero_amount_and_bad_method(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization([
            'subscription_end_date' => now()->addMonth()->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->from('/billing-center')
            ->post("/billing-center/organizations/{$organization->id}/payments", [
                'amount' => 0,
                'plan_name' => 'Premium',
                'payment_method' => 'cheque',
                'payment_date' => now()->toDateString(),
                'renew_months' => 3,
            ])
            ->assertSessionHasErrors(['amount', 'payment_method']);

        $this->assertDatabaseCount('subscription_payments', 0);

        $organization->refresh();
        $this->assertSame(
            now()->addMonth()->toDateString(),
            $organization->subscription_end_date?->toDateString()
        );
    }

    public function test_superadmin_can_update_subscription(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization();

        $this->actingAs($superAdmin)
            ->from('/billing-center')
            ->patch("/billing-center/organizations/{$organization->id}", [
                'plan' => 'enterprise',
                'status' => 'inactive',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addYear()->toDateString(),
                'max_students' => 5000,
                'max_staff' => 250,
            ])
            ->assertRedirect('/billing-center')
            ->assertSessionHas('success', "Subscription updated for {$organization->name}.");

        $organization->refresh();
        $this->assertSame('enterprise', $organization->subscription_plan);
        $this->assertSame('inactive', $organization->status);
        $this->assertSame(5000, $organization->max_students);
        $this->assertSame(250, $organization->max_staff);
        $this->assertSame(
            now()->addYear()->toDateString(),
            $organization->subscription_end_date?->toDateString()
        );
    }

    public function test_superadmin_can_suspend_and_reactivate_organization(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization();

        $this->actingAs($superAdmin)
            ->post("/billing-center/organizations/{$organization->id}/toggle-status")
            ->assertRedirect("/billing-center?organization_id={$organization->id}")
            ->assertSessionHas('success', "{$organization->name} is now suspended.");

        $organization->refresh();
        $this->assertSame('suspended', $organization->status);

        $this->actingAs($superAdmin)
            ->post("/billing-center/organizations/{$organization->id}/toggle-status")
            ->assertRedirect("/billing-center?organization_id={$organization->id}")
            ->assertSessionHas('success', "{$organization->name} is now active.");

        $organization->refresh();
        $this->assertSame('active', $organization->status);
    }

    public function test_suspended_organization_shows_expected_status_and_count(): void
    {
        $superAdmin = $this->createSuperAdmin();
        $organization = $this->createOrganization([
            'subscription_end_date' => now()->addMonth()->toDateString(),
        ]);

        $this->actingAs($superAdmin)
            ->post("/billing-center/organizations/{$organization->id}/toggle-status");

        $this->actingAs($superAdmin)
            ->get('/billing-center')
            ->assertInertia(fn ($page) => $page
                ->where('organizations.0.status', 'suspended')
                ->where('organizations.0.activeAccess', false)
                ->where('kpis.activeOrgs', 0)
            );
    }

    private function createSuperAdmin(): User
    {
        return User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);
    }

    private function createOrganization(array $overrides = []): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'school@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
            ...$overrides,
        ]);
    }
}