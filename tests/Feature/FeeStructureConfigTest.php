<?php

namespace Tests\Feature;

use App\Models\FeeDiscount;
use App\Models\FeeGroup;
use App\Models\FeeType;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeStructureConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_fee_groups_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $feeType = $this->createFeeType($organization, 'Tuition Fee');
        $this->createGroup($organization, 'Boarding Charges', [$feeType->id]);

        $this->actingAs($admin)
            ->get('/fee-groups')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FeeGroups')
                ->has('groups', 1)
                ->where('groups.0.name', 'Boarding Charges')
                ->where('groups.0.feeTypeIds.0', $feeType->id)
                ->where('feeTypes.0.name', 'Tuition Fee')
            );
    }

    public function test_admin_can_add_fee_group_with_fee_types(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $feeType = $this->createFeeType($organization, 'Hostel Fee');

        $this->actingAs($admin)
            ->post('/fee-groups', [
                'name' => 'Boarding Charges',
                'description' => 'Hostel & mess',
                'status' => 'active',
                'sort_order' => 1,
                'fee_type_ids' => [$feeType->id],
            ])
            ->assertRedirect();

        $group = FeeGroup::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($group);
        $this->assertSame('Boarding Charges', $group->name);
        $this->assertCount(1, $group->feeTypes);
        $this->assertSame($feeType->id, $group->feeTypes()->first()->id);
    }

    public function test_group_name_is_unique_per_organization(): void
    {
        $organization = $this->createOrganization('gurukul-a');
        $other = $this->createOrganization('gurukul-b', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $admin = $this->createUser($organization, 'admin');
        $this->createGroup($organization, 'Boarding Charges', []);

        $this->actingAs($admin)
            ->post('/fee-groups', ['name' => 'Boarding Charges', 'status' => 'active'])
            ->assertSessionHasErrors('name');

        $this->assertSame(1, FeeGroup::query()->where('organization_id', $organization->id)->count());
    }

    public function test_admin_can_update_fee_group_and_sync_types(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $tuition = $this->createFeeType($organization, 'Tuition Fee');
        $hostel = $this->createFeeType($organization, 'Hostel Fee');
        $group = $this->createGroup($organization, 'Boarding', [$tuition->id]);

        $this->actingAs($admin)
            ->patch("/fee-groups/{$group->id}", [
                'name' => 'Boarding & Hostel',
                'status' => 'active',
                'sort_order' => 2,
                'fee_type_ids' => [$hostel->id],
            ])
            ->assertRedirect();

        $fresh = $group->fresh();
        $this->assertSame('Boarding & Hostel', $fresh->name);
        $this->assertSame(2, $fresh->sort_order);
        $this->assertSame([$hostel->id], $fresh->feeTypes()->pluck('fee_types.id')->all());
    }

    public function test_admin_can_delete_fee_group(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $group = $this->createGroup($organization, 'Boarding', []);

        $this->actingAs($admin)
            ->delete("/fee-groups/{$group->id}")
            ->assertRedirect();

        $this->assertNull(FeeGroup::query()->find($group->id));
    }

    public function test_admin_can_view_fee_discounts_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $this->createDiscount($organization, 'Sibling Concession', 'percentage', 20);

        $this->actingAs($admin)
            ->get('/fees-discounts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FeeDiscounts')
                ->has('discounts', 1)
                ->where('discounts.0.name', 'Sibling Concession')
                ->where('discounts.0.discountType', 'percentage')
            );
    }

    public function test_admin_can_add_fee_discount(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/fees-discounts', [
                'name' => 'Sibling Concession',
                'discount_type' => 'percentage',
                'value' => 20,
                'description' => 'Second child discount',
                'status' => 'active',
            ])
            ->assertRedirect();

        $discount = FeeDiscount::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($discount);
        $this->assertSame('percentage', $discount->discount_type);
        $this->assertSame('20.00', (string) $discount->value);
    }

    public function test_admin_can_update_fee_discount(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $discount = $this->createDiscount($organization, 'Sibling Concession', 'percentage', 20);

        $this->actingAs($admin)
            ->patch("/fees-discounts/{$discount->id}", [
                'name' => 'Sibling Concession 25',
                'discount_type' => 'fixed',
                'value' => 500,
                'status' => 'inactive',
            ])
            ->assertRedirect();

        $fresh = $discount->fresh();
        $this->assertSame('Sibling Concession 25', $fresh->name);
        $this->assertSame('fixed', $fresh->discount_type);
        $this->assertSame('inactive', $fresh->status);
    }

    public function test_admin_can_delete_fee_discount(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $discount = $this->createDiscount($organization, 'Sibling Concession', 'percentage', 20);

        $this->actingAs($admin)
            ->delete("/fees-discounts/{$discount->id}")
            ->assertRedirect();

        $this->assertNull(FeeDiscount::query()->find($discount->id));
    }

    public function test_receptionist_cannot_manage_fee_structure(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->post('/fee-groups', ['name' => 'Boarding', 'status' => 'active'])
            ->assertForbidden();

        $this->actingAs($receptionist)
            ->post('/fees-discounts', [
                'name' => 'Sibling Concession',
                'discount_type' => 'percentage',
                'value' => 20,
                'status' => 'active',
            ])
            ->assertForbidden();
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

    private function createFeeType(Organization $organization, string $name): FeeType
    {
        return FeeType::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'description' => $name,
            'status' => 'active',
        ]);
    }

    private function createGroup(Organization $organization, string $name, array $feeTypeIds): FeeGroup
    {
        $group = FeeGroup::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'description' => $name,
            'status' => 'active',
            'sort_order' => 1,
        ]);
        if ($feeTypeIds) {
            $group->feeTypes()->sync($feeTypeIds);
        }

        return $group;
    }

    private function createDiscount(Organization $organization, string $name, string $type, float $value): FeeDiscount
    {
        return FeeDiscount::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'discount_type' => $type,
            'value' => $value,
            'description' => $name,
            'status' => 'active',
        ]);
    }
}