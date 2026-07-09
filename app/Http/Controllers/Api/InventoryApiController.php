<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use App\Models\InventoryIssue;
use App\Models\InventoryItem;
use App\Models\InventoryStockEntry;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InventoryApiController extends Controller
{
    public function getOverview()
    {
        $user = Auth::user();
        $organizationId = $user->organization_id;

        $itemCount = InventoryItem::where('organization_id', $organizationId)->count();
        $totalStock = InventoryItem::where('organization_id', $organizationId)->sum('available_stock');
        $lowStockCount = InventoryItem::where('organization_id', $organizationId)
            ->whereColumn('available_stock', '<=', 'minimum_stock')
            ->count();
        $categoryCount = InventoryCategory::where('organization_id', $organizationId)->count();
        $storeCount = InventoryStore::where('organization_id', $organizationId)->count();
        $supplierCount = InventorySupplier::where('organization_id', $organizationId)->count();
        $activeIssueCount = InventoryIssue::where('organization_id', $organizationId)->where('status', 'issued')->count();

        $totalValue = InventoryStockEntry::where('organization_id', $organizationId)
            ->get()
            ->sum(fn ($entry) => $entry->quantity * $entry->unit_price);

        $lowStockItems = InventoryItem::where('organization_id', $organizationId)
            ->whereColumn('available_stock', '<=', 'minimum_stock')
            ->with(['category', 'store', 'supplier'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'item_count' => $itemCount,
                'total_stock' => (int) $totalStock,
                'low_stock_count' => $lowStockCount,
                'category_count' => $categoryCount,
                'store_count' => $storeCount,
                'supplier_count' => $supplierCount,
                'active_issue_count' => $activeIssueCount,
                'total_value' => $totalValue,
                'low_stock_items' => $lowStockItems,
            ],
        ]);
    }

    public function getCategories()
    {
        $user = Auth::user();
        $categories = InventoryCategory::where('organization_id', $user->organization_id)
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $categories]);
    }

    public function storeCategory(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('inventory_categories', 'name')->where(fn ($q) => $q->where('organization_id', $user->organization_id))],
            'description' => ['nullable', 'string'],
        ]);

        $category = InventoryCategory::create([
            'organization_id' => $user->organization_id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Category added successfully', 'data' => $category], 201);
    }

    public function updateCategory(Request $request, InventoryCategory $category)
    {
        $user = Auth::user();
        if ($category->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $category->update($validated);

        return response()->json(['success' => true, 'message' => 'Category updated', 'data' => $category]);
    }

    public function destroyCategory(InventoryCategory $category)
    {
        $user = Auth::user();
        if ($category->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $category->delete();

        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }

    public function getStores()
    {
        $user = Auth::user();
        $stores = InventoryStore::where('organization_id', $user->organization_id)
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $stores]);
    }

    public function storeStore(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('inventory_stores', 'name')->where(fn ($q) => $q->where('organization_id', $user->organization_id))],
            'manager' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        $store = InventoryStore::create([
            'organization_id' => $user->organization_id,
            'name' => $validated['name'],
            'manager' => $validated['manager'],
            'location' => $validated['location'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Store added successfully', 'data' => $store], 201);
    }

    public function updateStore(Request $request, InventoryStore $store)
    {
        $user = Auth::user();
        if ($store->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'manager' => ['sometimes', 'required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        $store->update($validated);

        return response()->json(['success' => true, 'message' => 'Store updated', 'data' => $store]);
    }

    public function destroyStore(InventoryStore $store)
    {
        $user = Auth::user();
        if ($store->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $store->delete();

        return response()->json(['success' => true, 'message' => 'Store deleted']);
    }

    public function getSuppliers()
    {
        $user = Auth::user();
        $suppliers = InventorySupplier::where('organization_id', $user->organization_id)
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $suppliers]);
    }

    public function storeSupplier(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);

        $supplier = InventorySupplier::create([
            'organization_id' => $user->organization_id,
            'name' => $validated['name'],
            'contact_person' => $validated['contact_person'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Supplier added successfully', 'data' => $supplier], 201);
    }

    public function updateSupplier(Request $request, InventorySupplier $supplier)
    {
        $user = Auth::user();
        if ($supplier->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'contact_person' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
        ]);

        $supplier->update($validated);

        return response()->json(['success' => true, 'message' => 'Supplier updated', 'data' => $supplier]);
    }

    public function destroySupplier(InventorySupplier $supplier)
    {
        $user = Auth::user();
        if ($supplier->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $supplier->delete();

        return response()->json(['success' => true, 'message' => 'Supplier deleted']);
    }

    public function getItems()
    {
        $user = Auth::user();
        $items = InventoryItem::where('organization_id', $user->organization_id)
            ->with(['category', 'store', 'supplier'])
            ->orderBy('name')
            ->get();

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function storeItem(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'inventory_category_id' => ['required', 'exists:inventory_categories,id'],
            'inventory_store_id' => ['required', 'exists:inventory_stores,id'],
            'inventory_supplier_id' => ['required', 'exists:inventory_suppliers,id'],
            'unit' => ['required', 'string', 'max:50'],
            'available_stock' => ['nullable', 'integer', 'min:0'],
            'minimum_stock' => ['nullable', 'integer', 'min:0'],
        ]);

        $item = InventoryItem::create([
            'organization_id' => $user->organization_id,
            'inventory_category_id' => $validated['inventory_category_id'],
            'inventory_store_id' => $validated['inventory_store_id'],
            'inventory_supplier_id' => $validated['inventory_supplier_id'],
            'name' => $validated['name'],
            'unit' => $validated['unit'],
            'available_stock' => $validated['available_stock'] ?? 0,
            'minimum_stock' => $validated['minimum_stock'] ?? 0,
        ]);

        return response()->json(['success' => true, 'message' => 'Item added successfully', 'data' => $item->load(['category', 'store', 'supplier'])], 201);
    }

    public function updateItem(Request $request, InventoryItem $item)
    {
        $user = Auth::user();
        if ($item->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'inventory_category_id' => ['sometimes', 'required', 'exists:inventory_categories,id'],
            'inventory_store_id' => ['sometimes', 'required', 'exists:inventory_stores,id'],
            'inventory_supplier_id' => ['sometimes', 'required', 'exists:inventory_suppliers,id'],
            'unit' => ['sometimes', 'required', 'string', 'max:50'],
            'available_stock' => ['nullable', 'integer', 'min:0'],
            'minimum_stock' => ['nullable', 'integer', 'min:0'],
        ]);

        $item->update($validated);

        return response()->json(['success' => true, 'message' => 'Item updated', 'data' => $item->load(['category', 'store', 'supplier'])]);
    }

    public function destroyItem(InventoryItem $item)
    {
        $user = Auth::user();
        if ($item->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item deleted']);
    }

    public function getStockEntries()
    {
        $user = Auth::user();
        $entries = InventoryStockEntry::where('organization_id', $user->organization_id)
            ->with(['item', 'supplier', 'store'])
            ->orderBy('stock_date', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $entries]);
    }

    public function storeStockEntry(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'inventory_supplier_id' => ['required', 'exists:inventory_suppliers,id'],
            'inventory_store_id' => ['required', 'exists:inventory_stores,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'stock_date' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($user, $validated) {
            $entry = InventoryStockEntry::create([
                'organization_id' => $user->organization_id,
                'inventory_item_id' => $validated['inventory_item_id'],
                'inventory_supplier_id' => $validated['inventory_supplier_id'],
                'inventory_store_id' => $validated['inventory_store_id'],
                'quantity' => $validated['quantity'],
                'unit_price' => $validated['unit_price'] ?? 0,
                'stock_date' => $validated['stock_date'] ?? now(),
            ]);

            InventoryItem::where('id', $validated['inventory_item_id'])
                ->increment('available_stock', $validated['quantity']);

            return $entry;
        });

        return response()->json(['success' => true, 'message' => 'Stock added successfully']);
    }

    public function destroyStockEntry(InventoryStockEntry $stockEntry)
    {
        $user = Auth::user();
        if ($stockEntry->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        DB::transaction(function () use ($stockEntry) {
            InventoryItem::where('id', $stockEntry->inventory_item_id)
                ->decrement('available_stock', $stockEntry->quantity);

            $stockEntry->delete();
        });

        return response()->json(['success' => true, 'message' => 'Stock entry deleted']);
    }

    public function getIssues()
    {
        $user = Auth::user();
        $issues = InventoryIssue::where('organization_id', $user->organization_id)
            ->with('item')
            ->orderBy('issue_date', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $issues]);
    }

    public function storeIssue(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'issued_to' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'integer', 'min:1'],
            'issue_date' => ['nullable', 'date'],
            'return_date' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:issued,returned'],
        ]);

        $item = InventoryItem::find($validated['inventory_item_id']);

        if ($item->available_stock < $validated['quantity']) {
            return response()->json(['success' => false, 'message' => 'Insufficient stock'], 400);
        }

        DB::transaction(function () use ($user, $validated, $item) {
            InventoryIssue::create([
                'organization_id' => $user->organization_id,
                'inventory_item_id' => $validated['inventory_item_id'],
                'issued_to' => $validated['issued_to'],
                'quantity' => $validated['quantity'],
                'issue_date' => $validated['issue_date'] ?? now(),
                'return_date' => $validated['return_date'] ?? null,
                'status' => $validated['status'] ?? 'issued',
            ]);

            $item->decrement('available_stock', $validated['quantity']);
        });

        return response()->json(['success' => true, 'message' => 'Item issued successfully'], 201);
    }

    public function returnIssue(InventoryIssue $issue)
    {
        $user = Auth::user();
        if ($issue->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        DB::transaction(function () use ($issue) {
            $issue->update([
                'status' => 'returned',
                'return_date' => $issue->return_date ?? now(),
            ]);

            InventoryItem::where('id', $issue->inventory_item_id)
                ->increment('available_stock', $issue->quantity);
        });

        return response()->json(['success' => true, 'message' => 'Item returned successfully']);
    }

    public function destroyIssue(InventoryIssue $issue)
    {
        $user = Auth::user();
        if ($issue->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $issue->delete();

        return response()->json(['success' => true, 'message' => 'Issue record deleted']);
    }
}
