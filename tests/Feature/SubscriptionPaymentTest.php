<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_subscription_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/subscription')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Subscription')
                ->where('subscription.plan', 'premium')
                ->where('subscription.status', 'active')
                ->where('subscription.days_remaining', 45)
                ->where('subscription.org_name', 'Gurukul Public School')
            );
    }

    public function test_admin_can_view_payment_history(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        SubscriptionPayment::query()->create([
            'organization_id' => $organization->id,
            'amount' => 4999,
            'plan_name' => 'Premium',
            'transaction_id' => 'txn_12345',
            'payment_method' => 'UPI',
            'status' => 'completed',
            'payment_date' => '2026-08-01',
        ]);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/payment-history')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/SubscriptionHistory')
                ->has('history', 1)
                ->where('history.0.amount', '4999.00')
                ->where('history.0.transaction_id', 'txn_12345')
                ->where('history.0.payment_method', 'UPI')
            );
    }

    public function test_payment_history_ordered_latest_first(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        SubscriptionPayment::query()->create([
            'organization_id' => $organization->id,
            'amount' => 3000,
            'plan_name' => 'Basic',
            'transaction_id' => 'txn_old',
            'status' => 'completed',
            'payment_date' => '2026-01-01',
        ]);
        SubscriptionPayment::query()->create([
            'organization_id' => $organization->id,
            'amount' => 4999,
            'plan_name' => 'Premium',
            'transaction_id' => 'txn_new',
            'status' => 'completed',
            'payment_date' => '2026-08-01',
        ]);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/payment-history')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('history', 2)
                ->where('history.0.transaction_id', 'txn_new')
                ->where('history.1.transaction_id', 'txn_old')
            );
    }

    public function test_expired_organization_is_redirected_to_login(): void
    {
        $organization = $this->createOrganization();
        $organization->subscription_end_date = now()->subDays(5)->toDateString();
        $organization->save();

        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/subscription')
            ->assertRedirect(route('login'));
    }

    public function test_teacher_cannot_access_subscription_pages(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)->get('/subscription')->assertForbidden();
        $this->actingAs($teacher)->get('/payment-history')->assertForbidden();
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
            'subscription_start_date' => '2026-06-01',
            'subscription_end_date' => now()->addDays(45)->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}