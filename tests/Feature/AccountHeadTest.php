<?php

namespace Tests\Feature;

use App\Models\AccountHead;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountHeadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_income_heads_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'income',
            'name' => 'Tuition Fee',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/accounts/income-heads')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AccountHeads')
                ->where('type', 'income')
                ->has('heads', 1)
                ->where('heads.0.name', 'Tuition Fee')
            );
    }

    public function test_admin_can_view_expense_heads_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'expense',
            'name' => 'Salary',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/accounts/expense-heads')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AccountHeads')
                ->where('type', 'expense')
                ->has('heads', 1)
                ->where('heads.0.name', 'Salary')
            );
    }

    public function test_income_and_expense_heads_are_filtered_by_type(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'income',
            'name' => 'Donation',
            'status' => 'active',
        ]);
        AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'expense',
            'name' => 'Utility Bills',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/accounts/income-heads')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('heads', 1));

        $this->actingAs($admin)
            ->get('/accounts/expense-heads')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('heads', 1)
                ->where('heads.0.name', 'Utility Bills')
            );
    }

    public function test_receptionist_cannot_view_income_heads(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/accounts/income-heads')
            ->assertForbidden();
    }

    public function test_admin_can_add_income_head(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/accounts/income-heads', [
                'name' => 'Sports Fee',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('account_heads', [
            'organization_id' => $organization->id,
            'type' => 'income',
            'name' => 'Sports Fee',
        ]);
    }

    public function test_admin_can_add_expense_head(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/accounts/expense-heads', [
                'name' => 'Maintenance',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('account_heads', [
            'organization_id' => $organization->id,
            'type' => 'expense',
            'name' => 'Maintenance',
        ]);
    }

    public function test_head_name_is_required(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/accounts/income-heads', ['name' => ''])
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('account_heads', 0);
    }

    public function test_duplicate_head_name_is_not_duplicated(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)->post('/accounts/income-heads', ['name' => 'Tuition Fee']);
        $this->actingAs($admin)->post('/accounts/income-heads', ['name' => 'Tuition Fee']);

        $this->assertSame(1, AccountHead::query()->where('organization_id', $organization->id)->count());
    }

    public function test_admin_can_update_income_head(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $head = AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'income',
            'name' => 'Lab Fee',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->patch("/accounts/income-heads/{$head->id}", [
                'name' => 'Laboratory Fee',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('account_heads', [
            'id' => $head->id,
            'name' => 'Laboratory Fee',
        ]);
    }

    public function test_admin_can_delete_expense_head(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $head = AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'expense',
            'name' => 'Transport',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->delete("/accounts/expense-heads/{$head->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('account_heads', ['id' => $head->id]);
    }

    public function test_other_organization_cannot_modify_head(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $otherAdmin = $this->createUser($other, 'admin');
        $head = AccountHead::query()->create([
            'organization_id' => $organization->id,
            'type' => 'income',
            'name' => 'Admission Fee',
            'status' => 'active',
        ]);

        $this->actingAs($otherAdmin)
            ->patch("/accounts/income-heads/{$head->id}", ['name' => 'Hacked'])
            ->assertNotFound();

        $this->assertDatabaseHas('account_heads', [
            'id' => $head->id,
            'name' => 'Admission Fee',
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