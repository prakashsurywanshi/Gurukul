<?php

namespace App\Http\Controllers;

use App\Models\InventoryCategory;
use App\Models\InventoryIssue;
use App\Models\InventoryItem;
use App\Models\InventoryStockEntry;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/InventoryManagement', [
            'user' => $user,
            ...$this->inventoryPayload($organization),
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization($request);

        $data = $this->validateCategory($request, $organization);

        InventoryCategory::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        return back()->with('success', 'Item category added successfully.');
    }

    public function updateCategory(Request $request, InventoryCategory $category): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($category, $organization);

        $data = $this->validateCategory($request, $organization, $category);

        $category->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        return back()->with('success', 'Item category updated successfully.');
    }

    public function destroyCategory(Request $request, InventoryCategory $category): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($category, $organization);

        if ($category->items()->exists()) {
            return back()->with('error', 'Delete or reassign linked items before removing this category.');
        }

        $category->delete();

        return back()->with('success', 'Item category deleted successfully.');
    }

    public function storeStore(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization($request);

        $data = $this->validateStore($request, $organization);

        InventoryStore::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'manager' => $data['manager'],
            'location' => $data['location'] ?? null,
        ]);

        return back()->with('success', 'Item store added successfully.');
    }

    public function updateStore(Request $request, InventoryStore $store): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($store, $organization);

        $data = $this->validateStore($request, $organization, $store);

        $store->update([
            'name' => $data['name'],
            'manager' => $data['manager'],
            'location' => $data['location'] ?? null,
        ]);

        return back()->with('success', 'Item store updated successfully.');
    }

    public function destroyStore(Request $request, InventoryStore $store): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($store, $organization);

        if (
            InventoryItem::query()->where('organization_id', $organization->id)->where('inventory_store_id', $store->id)->exists()
            || InventoryStockEntry::query()->where('organization_id', $organization->id)->where('inventory_store_id', $store->id)->exists()
        ) {
            return back()->with('error', 'Delete or reassign linked items and stock entries before removing this store.');
        }

        $store->delete();

        return back()->with('success', 'Item store deleted successfully.');
    }

    public function storeSupplier(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization($request);

        $data = $this->validateSupplier($request);

        InventorySupplier::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'contact_person' => $data['contactPerson'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
        ]);

        return back()->with('success', 'Item supplier added successfully.');
    }

    public function updateSupplier(Request $request, InventorySupplier $supplier): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($supplier, $organization);

        $data = $this->validateSupplier($request);

        $supplier->update([
            'name' => $data['name'],
            'contact_person' => $data['contactPerson'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
        ]);

        return back()->with('success', 'Item supplier updated successfully.');
    }

    public function destroySupplier(Request $request, InventorySupplier $supplier): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($supplier, $organization);

        if (
            InventoryItem::query()->where('organization_id', $organization->id)->where('inventory_supplier_id', $supplier->id)->exists()
            || InventoryStockEntry::query()->where('organization_id', $organization->id)->where('inventory_supplier_id', $supplier->id)->exists()
        ) {
            return back()->with('error', 'Delete or reassign linked items and stock entries before removing this supplier.');
        }

        $supplier->delete();

        return back()->with('success', 'Item supplier deleted successfully.');
    }

    public function storeItem(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization($request);

        $data = $this->validateItem($request, $organization);

        InventoryItem::create([
            'organization_id' => $organization->id,
            'inventory_category_id' => $data['categoryId'],
            'inventory_store_id' => $data['storeId'],
            'inventory_supplier_id' => $data['supplierId'],
            'name' => $data['name'],
            'unit' => $data['unit'],
            'available_stock' => (int) ($data['availableStock'] ?? 0),
            'minimum_stock' => (int) ($data['minimumStock'] ?? 0),
        ]);

        return back()->with('success', 'Inventory item added successfully.');
    }

    public function updateItem(Request $request, InventoryItem $item): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($item, $organization);

        $data = $this->validateItem($request, $organization);

        $item->update([
            'inventory_category_id' => $data['categoryId'],
            'inventory_store_id' => $data['storeId'],
            'inventory_supplier_id' => $data['supplierId'],
            'name' => $data['name'],
            'unit' => $data['unit'],
            'available_stock' => (int) ($data['availableStock'] ?? 0),
            'minimum_stock' => (int) ($data['minimumStock'] ?? 0),
        ]);

        return back()->with('success', 'Inventory item updated successfully.');
    }

    public function destroyItem(Request $request, InventoryItem $item): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($item, $organization);

        if (
            InventoryStockEntry::query()->where('organization_id', $organization->id)->where('inventory_item_id', $item->id)->exists()
            || InventoryIssue::query()->where('organization_id', $organization->id)->where('inventory_item_id', $item->id)->exists()
        ) {
            return back()->with('error', 'Delete linked stock and issue records before removing this item.');
        }

        $item->delete();

        return back()->with('success', 'Inventory item deleted successfully.');
    }

    public function storeStock(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization($request);

        $data = $this->validateStock($request, $organization);

        DB::transaction(function () use ($organization, $data) {
            $item = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($data['itemId']);

            InventoryStockEntry::create([
                'organization_id' => $organization->id,
                'inventory_item_id' => $item->id,
                'inventory_supplier_id' => $data['supplierId'],
                'inventory_store_id' => $data['storeId'],
                'quantity' => (int) $data['quantity'],
                'unit_price' => (float) ($data['unitPrice'] ?? 0),
                'stock_date' => $data['date'],
            ]);

            $item->update([
                'available_stock' => $item->available_stock + (int) $data['quantity'],
                'inventory_store_id' => $data['storeId'],
                'inventory_supplier_id' => $data['supplierId'],
            ]);
        });

        return back()->with('success', 'Stock added successfully.');
    }

    public function updateStock(Request $request, InventoryStockEntry $stockEntry): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($stockEntry, $organization);

        $data = $this->validateStock($request, $organization);

        DB::transaction(function () use ($organization, $stockEntry, $data) {
            $currentItem = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($stockEntry->inventory_item_id);

            $nextItem = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($data['itemId']);

            if ($currentItem->id === $nextItem->id) {
                $nextAvailableStock = $currentItem->available_stock - $stockEntry->quantity + (int) $data['quantity'];

                if ($nextAvailableStock < 0) {
                    throw ValidationException::withMessages([
                        'quantity' => 'This update would reduce available stock below zero.',
                    ]);
                }

                $currentItem->update([
                    'available_stock' => $nextAvailableStock,
                    'inventory_store_id' => $data['storeId'],
                    'inventory_supplier_id' => $data['supplierId'],
                ]);
            } else {
                $currentAvailableStock = $currentItem->available_stock - $stockEntry->quantity;

                if ($currentAvailableStock < 0) {
                    throw ValidationException::withMessages([
                        'quantity' => 'This stock entry cannot be moved because those units are already in use.',
                    ]);
                }

                $currentItem->update([
                    'available_stock' => $currentAvailableStock,
                ]);

                $nextItem->update([
                    'available_stock' => $nextItem->available_stock + (int) $data['quantity'],
                    'inventory_store_id' => $data['storeId'],
                    'inventory_supplier_id' => $data['supplierId'],
                ]);
            }

            $stockEntry->update([
                'inventory_item_id' => $nextItem->id,
                'inventory_supplier_id' => $data['supplierId'],
                'inventory_store_id' => $data['storeId'],
                'quantity' => (int) $data['quantity'],
                'unit_price' => (float) ($data['unitPrice'] ?? 0),
                'stock_date' => $data['date'],
            ]);
        });

        return back()->with('success', 'Stock entry updated successfully.');
    }

    public function destroyStock(Request $request, InventoryStockEntry $stockEntry): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($stockEntry, $organization);

        DB::transaction(function () use ($organization, $stockEntry) {
            $item = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($stockEntry->inventory_item_id);

            $nextAvailableStock = $item->available_stock - $stockEntry->quantity;

            if ($nextAvailableStock < 0) {
                throw ValidationException::withMessages([
                    'quantity' => 'This stock entry cannot be deleted because those units are already in use.',
                ]);
            }

            $item->update([
                'available_stock' => $nextAvailableStock,
            ]);

            $stockEntry->delete();
        });

        return back()->with('success', 'Stock entry deleted successfully.');
    }

    public function issueItem(Request $request): RedirectResponse
    {
        $organization = $this->requireOrganization($request);

        $data = $this->validateIssue($request, $organization);
        $nextNetIssuedQuantity = $this->netIssuedQuantity((int) $data['quantity'], $data['returnDate'] ?? null);

        DB::transaction(function () use ($organization, $data, $nextNetIssuedQuantity) {
            $item = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($data['itemId']);

            if ($item->available_stock < $nextNetIssuedQuantity) {
                throw ValidationException::withMessages([
                    'quantity' => 'Issue quantity cannot exceed available stock.',
                ]);
            }

            InventoryIssue::create([
                'organization_id' => $organization->id,
                'inventory_item_id' => $item->id,
                'issued_to' => $data['issuedTo'],
                'quantity' => (int) $data['quantity'],
                'issue_date' => $data['issueDate'],
                'return_date' => $data['returnDate'] ?? null,
                'status' => ($data['returnDate'] ?? null) ? 'Returned' : 'Issued',
            ]);

            $item->update([
                'available_stock' => $item->available_stock - $nextNetIssuedQuantity,
            ]);
        });

        return back()->with('success', 'Item issued successfully.');
    }

    public function updateIssue(Request $request, InventoryIssue $issue): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($issue, $organization);

        $data = $this->validateIssue($request, $organization);
        $currentNetIssuedQuantity = $this->netIssuedQuantity($issue->quantity, $issue->return_date);
        $nextNetIssuedQuantity = $this->netIssuedQuantity((int) $data['quantity'], $data['returnDate'] ?? null);

        DB::transaction(function () use ($organization, $issue, $data, $currentNetIssuedQuantity, $nextNetIssuedQuantity) {
            $currentItem = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($issue->inventory_item_id);

            $nextItem = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($data['itemId']);

            if ($currentItem->id === $nextItem->id) {
                $nextAvailableStock = $currentItem->available_stock + $currentNetIssuedQuantity - $nextNetIssuedQuantity;

                if ($nextAvailableStock < 0) {
                    throw ValidationException::withMessages([
                        'quantity' => 'Issue quantity cannot exceed available stock.',
                    ]);
                }

                $currentItem->update([
                    'available_stock' => $nextAvailableStock,
                ]);
            } else {
                $currentItem->update([
                    'available_stock' => $currentItem->available_stock + $currentNetIssuedQuantity,
                ]);

                if ($nextItem->available_stock < $nextNetIssuedQuantity) {
                    throw ValidationException::withMessages([
                        'quantity' => 'Issue quantity cannot exceed available stock.',
                    ]);
                }

                $nextItem->update([
                    'available_stock' => $nextItem->available_stock - $nextNetIssuedQuantity,
                ]);
            }

            $issue->update([
                'inventory_item_id' => $nextItem->id,
                'issued_to' => $data['issuedTo'],
                'quantity' => (int) $data['quantity'],
                'issue_date' => $data['issueDate'],
                'return_date' => $data['returnDate'] ?? null,
                'status' => ($data['returnDate'] ?? null) ? 'Returned' : 'Issued',
            ]);
        });

        return back()->with('success', 'Issue record updated successfully.');
    }

    public function returnIssue(Request $request, InventoryIssue $issue): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($issue, $organization);

        if ($issue->status === 'Returned' || $issue->return_date) {
            return back()->with('error', 'This issue record is already marked as returned.');
        }

        DB::transaction(function () use ($organization, $issue) {
            $item = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($issue->inventory_item_id);

            $item->update([
                'available_stock' => $item->available_stock + $issue->quantity,
            ]);

            $issue->update([
                'return_date' => now()->toDateString(),
                'status' => 'Returned',
            ]);
        });

        return back()->with('success', 'Item returned successfully.');
    }

    public function destroyIssue(Request $request, InventoryIssue $issue): RedirectResponse
    {
        $organization = $this->requireOrganization($request);
        $this->ensureBelongsToOrganization($issue, $organization);

        DB::transaction(function () use ($organization, $issue) {
            $item = InventoryItem::query()
                ->where('organization_id', $organization->id)
                ->findOrFail($issue->inventory_item_id);

            $netIssuedQuantity = $this->netIssuedQuantity($issue->quantity, $issue->return_date);

            if ($netIssuedQuantity > 0) {
                $item->update([
                    'available_stock' => $item->available_stock + $netIssuedQuantity,
                ]);
            }

            $issue->delete();
        });

        return back()->with('success', 'Issue record deleted successfully.');
    }

    private function inventoryPayload(Organization $organization): array
    {
        $categories = InventoryCategory::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->get()
            ->map(fn (InventoryCategory $category) => [
                'id' => (string) $category->id,
                'name' => $category->name,
                'description' => $category->description ?? '',
            ])
            ->values();

        $stores = InventoryStore::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->get()
            ->map(fn (InventoryStore $store) => [
                'id' => (string) $store->id,
                'name' => $store->name,
                'manager' => $store->manager,
                'location' => $store->location ?? '',
            ])
            ->values();

        $suppliers = InventorySupplier::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->get()
            ->map(fn (InventorySupplier $supplier) => [
                'id' => (string) $supplier->id,
                'name' => $supplier->name,
                'contactPerson' => $supplier->contact_person,
                'phone' => $supplier->phone ?? '',
                'email' => $supplier->email ?? '',
                'address' => $supplier->address ?? '',
            ])
            ->values();

        $items = InventoryItem::query()
            ->where('organization_id', $organization->id)
            ->with(['category', 'store', 'supplier'])
            ->latest('id')
            ->get()
            ->map(fn (InventoryItem $item) => [
                'id' => (string) $item->id,
                'name' => $item->name,
                'categoryId' => (string) $item->inventory_category_id,
                'category' => $item->category?->name ?? '',
                'storeId' => (string) $item->inventory_store_id,
                'store' => $item->store?->name ?? '',
                'supplierId' => (string) $item->inventory_supplier_id,
                'supplier' => $item->supplier?->name ?? '',
                'unit' => $item->unit,
                'availableStock' => (int) $item->available_stock,
                'minimumStock' => (int) $item->minimum_stock,
            ])
            ->values();

        $stockEntries = InventoryStockEntry::query()
            ->where('organization_id', $organization->id)
            ->with(['item', 'supplier', 'store'])
            ->latest('id')
            ->get()
            ->map(fn (InventoryStockEntry $entry) => [
                'id' => (string) $entry->id,
                'itemId' => (string) $entry->inventory_item_id,
                'itemName' => $entry->item?->name ?? '',
                'supplierId' => (string) $entry->inventory_supplier_id,
                'supplier' => $entry->supplier?->name ?? '',
                'storeId' => (string) $entry->inventory_store_id,
                'store' => $entry->store?->name ?? '',
                'quantity' => (int) $entry->quantity,
                'unitPrice' => (float) $entry->unit_price,
                'date' => optional($entry->stock_date)->format('Y-m-d'),
            ])
            ->values();

        $issueRecords = InventoryIssue::query()
            ->where('organization_id', $organization->id)
            ->with('item')
            ->latest('id')
            ->get()
            ->map(fn (InventoryIssue $issue) => [
                'id' => (string) $issue->id,
                'itemId' => (string) $issue->inventory_item_id,
                'itemName' => $issue->item?->name ?? '',
                'issuedTo' => $issue->issued_to,
                'quantity' => (int) $issue->quantity,
                'issueDate' => optional($issue->issue_date)->format('Y-m-d'),
                'returnDate' => optional($issue->return_date)->format('Y-m-d') ?? '',
                'status' => $issue->status,
            ])
            ->values();

        return compact('categories', 'stores', 'suppliers', 'items', 'stockEntries', 'issueRecords');
    }

    private function requireOrganization(Request $request): Organization
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        return $organization;
    }

    private function validateCategory(Request $request, Organization $organization, ?InventoryCategory $category = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('inventory_categories', 'name')
                    ->where(fn ($query) => $query->where('organization_id', $organization->id))
                    ->ignore($category?->id),
            ],
            'description' => ['nullable', 'string'],
        ]);
    }

    private function validateStore(Request $request, Organization $organization, ?InventoryStore $store = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('inventory_stores', 'name')
                    ->where(fn ($query) => $query->where('organization_id', $organization->id))
                    ->ignore($store?->id),
            ],
            'manager' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function validateSupplier(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contactPerson' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);
    }

    private function validateItem(Request $request, Organization $organization): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'categoryId' => [
                'required',
                Rule::exists('inventory_categories', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'storeId' => [
                'required',
                Rule::exists('inventory_stores', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'supplierId' => [
                'required',
                Rule::exists('inventory_suppliers', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'unit' => ['required', 'string', 'max:50'],
            'availableStock' => ['nullable', 'integer', 'min:0'],
            'minimumStock' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function validateStock(Request $request, Organization $organization): array
    {
        return $request->validate([
            'itemId' => [
                'required',
                Rule::exists('inventory_items', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'supplierId' => [
                'required',
                Rule::exists('inventory_suppliers', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'storeId' => [
                'required',
                Rule::exists('inventory_stores', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'quantity' => ['required', 'integer', 'min:1'],
            'unitPrice' => ['nullable', 'numeric', 'min:0'],
            'date' => ['required', 'date'],
        ]);
    }

    private function validateIssue(Request $request, Organization $organization): array
    {
        return $request->validate([
            'itemId' => [
                'required',
                Rule::exists('inventory_items', 'id')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'issuedTo' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'issueDate' => ['required', 'date'],
            'returnDate' => ['nullable', 'date', 'after_or_equal:issueDate'],
        ]);
    }

    private function ensureBelongsToOrganization(object $model, Organization $organization): void
    {
        abort_unless((int) $model->organization_id === (int) $organization->id, 404);
    }

    private function netIssuedQuantity(int $quantity, mixed $returnDate): int
    {
        return $returnDate ? 0 : $quantity;
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (!$user) {
            return null;
        }

        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
