<?php

namespace Tests\Feature;

use App\Models\GoodsReceipt;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use App\Models\InventoryStockEntry;
use App\Models\Organization;
use App\Models\PosSale;
use App\Models\SupplierPayment;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreOpsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_point_of_sale_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $item = $this->createInventoryItem($organization, 'Notebook', 50, 10);

        $this->actingAs($admin)
            ->get('/store/pos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PointOfSale')
                ->has('catalog', 1)
                ->where('catalog.0.name', 'Notebook')
                ->where('catalog.0.availableStock', 50)
                ->where('summary.salesCount', 0)
            );
    }

    public function test_sale_debits_stock_and_creates_invoice(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $item = $this->createInventoryItem($organization, 'Pen', 20, 5);
        InventoryStockEntry::query()->create([
            'organization_id' => $organization->id,
            'inventory_item_id' => $item->id,
            'inventory_supplier_id' => $item->inventory_supplier_id,
            'inventory_store_id' => $item->inventory_store_id,
            'quantity' => 20,
            'unit_price' => 10,
            'stock_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)
            ->post('/store/sales', [
                'customer_name' => 'Rahul',
                'customer_phone' => '+919999999999',
                'discount' => 0,
                'tax' => 0,
                'payment_method' => 'cash',
                'payment_status' => 'paid',
                'items' => [
                    ['id' => $item->id, 'quantity' => 4],
                ],
            ])
            ->assertRedirect();

        $sale = PosSale::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($sale);
        $this->assertSame('paid', $sale->payment_status);
        $this->assertSame(40.0, (float) $sale->total_amount);
        $this->assertSame(1, $sale->items()->count());
        $this->assertSame(16, $item->fresh()->available_stock);
        $this->assertStringStartsWith('POS-', $sale->invoice_no);
    }

    public function test_sale_rejects_insufficient_stock(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $item = $this->createInventoryItem($organization, 'Eraser', 4, 1);

        $this->actingAs($admin)
            ->post('/store/sales', [
                'payment_method' => 'cash',
                'payment_status' => 'paid',
                'items' => [
                    ['id' => $item->id, 'quantity' => 10],
                ],
            ])
            ->assertStatus(422);

        $this->assertSame(0, PosSale::query()->count());
        $this->assertSame(4, $item->fresh()->available_stock);
    }

    public function test_deleting_sale_restores_stock(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $item = $this->createInventoryItem($organization, 'Scale', 30, 5);

        $this->actingAs($admin)->post('/store/sales', [
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'items' => [['id' => $item->id, 'quantity' => 3]],
        ]);

        $sale = PosSale::query()->first();
        $this->assertSame(27, $item->fresh()->available_stock);

        $this->actingAs($admin)->delete("/store/sales/{$sale->id}")->assertRedirect();

        $this->assertNull(PosSale::find($sale->id));
        $this->assertSame(30, $item->fresh()->available_stock);
    }

    public function test_goods_receipt_increments_stock_and_creates_ledger_entry(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $supplier = InventorySupplier::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Paper House',
            'contact_person' => 'Suresh',
            'phone' => '+911111111111',
        ]);
        $item = $this->createInventoryItem($organization, 'A4 Paper', 10, 20);

        $this->actingAs($admin)
            ->post('/store/goods-receipts', [
                'inventory_supplier_id' => $supplier->id,
                'receipt_date' => '2026-09-01',
                'items' => [
                    ['inventory_item_id' => $item->id, 'quantity' => 40, 'unit_price' => 50],
                ],
            ])
            ->assertRedirect();

        $receipt = GoodsReceipt::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($receipt);
        $this->assertSame(2000.0, (float) $receipt->total_amount);
        $this->assertStringStartsWith('GRN-', $receipt->grn_number);
        $this->assertSame(1, $receipt->items()->count());
        $this->assertSame(50, $item->fresh()->available_stock);
        $this->assertSame(1, InventoryStockEntry::query()->count());
        $this->assertSame(50.0, (float) InventoryStockEntry::query()->first()->unit_price);
    }

    public function test_deleting_goods_receipt_reverts_stock(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $item = $this->createInventoryItem($organization, 'Chalk', 100, 50);

        $this->actingAs($admin)->post('/store/goods-receipts', [
            'items' => [['inventory_item_id' => $item->id, 'quantity' => 20, 'unit_price' => 5]],
        ]);

        $receipt = GoodsReceipt::query()->first();
        $this->assertSame(120, $item->fresh()->available_stock);

        $this->actingAs($admin)->delete("/store/goods-receipts/{$receipt->id}")->assertRedirect();

        $this->assertNull(GoodsReceipt::find($receipt->id));
        $this->assertSame(100, $item->fresh()->available_stock);
    }

    public function test_supplier_payment_crud(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $supplier = InventorySupplier::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Stationery Mart',
            'contact_person' => 'Vikram',
            'phone' => '+912222222222',
        ]);

        $this->actingAs($admin)
            ->get('/store/supplier-payments')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/SupplierPayments')
                ->has('suppliers', 1)
                ->where('suppliers.0.name', 'Stationery Mart')
            );

        $this->actingAs($admin)
            ->post('/store/supplier-payments', [
                'inventory_supplier_id' => $supplier->id,
                'amount' => 2500,
                'payment_date' => '2026-09-02',
                'payment_method' => 'bank_transfer',
                'reference_no' => 'UTR123456',
            ])
            ->assertRedirect();

        $payment = SupplierPayment::query()->first();
        $this->assertNotNull($payment);
        $this->assertSame(2500.0, (float) $payment->amount);
        $this->assertSame('bank_transfer', $payment->payment_method);

        $this->actingAs($admin)->delete("/store/supplier-payments/{$payment->id}")->assertRedirect();
        $this->assertNull(SupplierPayment::find($payment->id));
    }

    public function test_non_admin_cannot_access_store_operations(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)->get('/store/pos')->assertStatus(403);
        $this->actingAs($receptionist)->get('/store/goods-receipts')->assertStatus(403);
        $this->actingAs($receptionist)->get('/store/supplier-payments')->assertStatus(403);
    }

    public function test_cross_organization_records_are_not_accessible(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);

        $adminA = $this->createUser($organizationA, 'admin');
        $adminB = $this->createUser($organizationB, 'admin');

        $itemB = $this->createInventoryItem($organizationB, 'Marker', 20, 5);
        $saleB = PosSale::query()->create([
            'organization_id' => $organizationB->id,
            'invoice_no' => 'POS-X1',
            'sale_date' => now()->toDateString(),
            'total_amount' => 100,
            'cashier_id' => $adminB->id,
        ]);

        $this->actingAs($adminA)->delete("/store/sales/{$saleB->id}")->assertStatus(404);
        $this->assertNotNull(PosSale::find($saleB->id));
        $this->assertSame(20, $itemB->fresh()->available_stock);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Test School '.$counter,
            'slug' => 'test-school-'.$counter,
            'email' => 'org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $emailCounter = 0;
        $emailCounter++;

        return User::factory()->create([
            'name' => $role.' user '.$emailCounter,
            'email' => $role.'-'.$emailCounter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }

    private function createInventoryItem(Organization $organization, string $name, int $stock, int $minimum): InventoryItem
    {
        static $categoryCounter = 0;
        $categoryCounter++;

        $category = InventoryCategory::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Category '.$categoryCounter,
        ]);

        $store = InventoryStore::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Store '.$categoryCounter,
            'manager' => 'Manager '.$categoryCounter,
            'location' => 'Main Building',
        ]);

        $supplier = InventorySupplier::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Supplier '.$categoryCounter,
            'contact_person' => 'Contact '.$categoryCounter,
            'phone' => '+91'.str_pad((string) $categoryCounter, 10, '0', STR_PAD_LEFT),
            'email' => 'supplier'.$categoryCounter.'@example.com',
            'address' => 'Main Road',
        ]);

        return InventoryItem::query()->create([
            'organization_id' => $organization->id,
            'inventory_category_id' => $category->id,
            'inventory_store_id' => $store->id,
            'inventory_supplier_id' => $supplier->id,
            'name' => $name,
            'unit' => 'pcs',
            'available_stock' => $stock,
            'minimum_stock' => $minimum,
        ]);
    }
}