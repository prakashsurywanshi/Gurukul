<?php

namespace App\Http\Controllers;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\InventoryItem;
use App\Models\InventoryStockEntry;
use App\Models\InventorySupplier;
use App\Models\Organization;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GoodsReceiptController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $receipts = GoodsReceipt::query()
            ->where('organization_id', $organization->id)
            ->with(['items', 'supplier:id,organization_id,name', 'receiver:id,name'])
            ->orderByDesc('receipt_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($receipt) => [
                'id' => $receipt->id,
                'grnNumber' => $receipt->grn_number,
                'receiptDate' => $receipt->receipt_date->toDateString(),
                'supplierName' => $receipt->supplier?->name,
                'totalAmount' => (float) $receipt->total_amount,
                'notes' => $receipt->notes,
                'receivedByName' => $receipt->receiver?->name,
                'items' => $receipt->items->map(fn ($item) => [
                    'itemName' => $item->item_name,
                    'unit' => $item->unit,
                    'unitPrice' => (float) $item->unit_price,
                    'quantity' => $item->quantity,
                    'amount' => (float) $item->amount,
                ])->values(),
            ]);

        $items = InventoryItem::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'unit' => $item->unit,
                'availableStock' => $item->available_stock,
            ]);

        return Inertia::render('dashboard/GoodsReceipts', [
            'receipts' => $receipts,
            'itemOptions' => $items,
            'supplierOptions' => InventorySupplier::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']),
            'orderOptions' => PurchaseOrder::query()->where('organization_id', $organization->id)->whereIn('status', ['approved', 'submitted'])->orderByDesc('id')->get(['id', 'po_number']),
            'summary' => [
                'receiptsCount' => $receipts->count(),
                'monthTotal' => (float) GoodsReceipt::query()->where('organization_id', $organization->id)->whereMonth('receipt_date', now()->month)->whereYear('receipt_date', now()->year)->sum('total_amount'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'inventory_supplier_id' => ['nullable', 'integer', Rule::exists('inventory_suppliers', 'id')->where('organization_id', $organization->id)],
            'purchase_order_id' => ['nullable', 'integer', Rule::exists('purchase_orders', 'id')->where('organization_id', $organization->id)],
            'receipt_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($organization, $user, $validated) {
            $total = 0;
            foreach ($validated['items'] as $entry) {
                $total += $entry['quantity'] * (float) $entry['unit_price'];
            }

            $grn = GoodsReceipt::query()->create([
                'organization_id' => $organization->id,
                'grn_number' => $this->nextGrnNumber($organization),
                'inventory_supplier_id' => $validated['inventory_supplier_id'] ?? null,
                'purchase_order_id' => $validated['purchase_order_id'] ?? null,
                'receipt_date' => $validated['receipt_date'] ?? now()->toDateString(),
                'total_amount' => round($total, 2),
                'notes' => $validated['notes'] ?? null,
                'received_by' => $user->id,
            ]);

            foreach ($validated['items'] as $entry) {
                $item = InventoryItem::query()
                    ->where('organization_id', $organization->id)
                    ->find($entry['inventory_item_id']);
                abort_unless($item, 422, "Item {$entry['inventory_item_id']} not found.");

                $item->increment('available_stock', $entry['quantity']);

                GoodsReceiptItem::query()->create([
                    'goods_receipt_id' => $grn->id,
                    'inventory_item_id' => $item->id,
                    'item_name' => $item->name,
                    'unit' => $item->unit,
                    'unit_price' => $entry['unit_price'],
                    'quantity' => $entry['quantity'],
                    'amount' => round($entry['quantity'] * (float) $entry['unit_price'], 2),
                ]);

                InventoryStockEntry::query()->create([
                    'organization_id' => $organization->id,
                    'inventory_item_id' => $item->id,
                    'inventory_supplier_id' => $validated['inventory_supplier_id'] ?? $item->inventory_supplier_id,
                    'inventory_store_id' => $item->inventory_store_id,
                    'quantity' => $entry['quantity'],
                    'unit_price' => $entry['unit_price'],
                    'stock_date' => $validated['receipt_date'] ?? now()->toDateString(),
                ]);
            }
        });

        return back()->with('success', 'Goods receipt recorded and stock updated.');
    }

    public function destroy(Request $request, GoodsReceipt $goodsReceipt): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($goodsReceipt->organization_id === $organization->id, 404);

        DB::transaction(function () use ($goodsReceipt) {
            foreach ($goodsReceipt->items as $item) {
                $inventory = InventoryItem::query()->find($item->inventory_item_id);
                if ($inventory) {
                    $inventory->decrement('available_stock', $item->quantity);
                }
            }

            $goodsReceipt->delete();
        });

        return back()->with('success', 'Goods receipt deleted and stock reverted.');
    }

    private function nextGrnNumber(Organization $organization): string
    {
        $count = GoodsReceipt::query()->where('organization_id', $organization->id)->count() + 1;

        return 'GRN-'.now()->format('Ymd').'-'.str_pad((string) $count, 3, '0', STR_PAD_LEFT);
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

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