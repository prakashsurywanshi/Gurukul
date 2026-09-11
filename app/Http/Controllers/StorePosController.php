<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryStockEntry;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StorePosController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $catalog = InventoryItem::query()
            ->where('organization_id', $organization->id)
            ->with('supplier:id,organization_id,name')
            ->with('store:id,organization_id,name')
            ->orderBy('name')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'unit' => $item->unit,
                'unitPrice' => (float) InventoryStockEntry::query()->where('inventory_item_id', $item->id)->latest('stock_date')->value('unit_price') ?? 0,
                'availableStock' => $item->available_stock,
                'minimumStock' => $item->minimum_stock,
                'store' => $item->store?->name,
                'supplier' => $item->supplier?->name,
                'lowStock' => $item->available_stock <= $item->minimum_stock,
            ]);

        $salesQuery = PosSale::query()
            ->where('organization_id', $organization->id)
            ->with(['items', 'cashier:id,name']);

        if ($search = trim((string) $request->query('search'))) {
            $salesQuery->where(function ($builder) use ($search) {
                $builder->where('invoice_no', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        if ($from = (string) $request->query('from')) {
            $salesQuery->whereDate('sale_date', '>=', $from);
        }

        if ($to = (string) $request->query('to')) {
            $salesQuery->whereDate('sale_date', '<=', $to);
        }

        $sales = $salesQuery->orderByDesc('sale_date')->orderByDesc('id')->limit(200)->get()->map($this->salePayload());

        $totals = PosSale::query()->where('organization_id', $organization->id)->get();

        return Inertia::render('dashboard/PointOfSale', [
            'user' => $user,
            'catalog' => $catalog,
            'sales' => $sales,
            'filters' => [
                'search' => (string) $request->query('search'),
                'from' => $from ?: null,
                'to' => $to ?: null,
            ],
            'summary' => [
                'today' => (float) PosSale::query()->where('organization_id', $organization->id)->whereDate('sale_date', today())->sum('total_amount'),
                'total' => (float) $totals->sum('total_amount'),
                'salesCount' => $totals->count(),
                'lowStock' => InventoryItem::query()->where('organization_id', $organization->id)->whereColumn('available_stock', '<=', 'minimum_stock')->count(),
            ],
        ]);
    }

    public function storeSale(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:20'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'upi', 'bank_transfer', 'other'])],
            'payment_status' => ['required', Rule::in(['paid', 'pending'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $items = [];
        $subtotal = 0;

        DB::transaction(function () use ($organization, $user, $validated, &$items, &$subtotal) {
            foreach ($validated['items'] as $entry) {
                $item = InventoryItem::query()
                    ->where('organization_id', $organization->id)
                    ->find($entry['id']);
                abort_unless($item, 422, "Item {$entry['id']} not found.");

                $item->refresh();
                if ($item->available_stock < $entry['quantity']) {
                    abort(422, "Insufficient stock for {$item->name}.");
                }

                $unitPrice = (float) (InventoryStockEntry::query()->where('inventory_item_id', $item->id)->latest('stock_date')->value('unit_price') ?? 0);

                $item->decrement('available_stock', $entry['quantity']);

                $items[] = ['item' => $item, 'quantity' => $entry['quantity'], 'unitPrice' => $unitPrice];
                $subtotal += $entry['quantity'] * $unitPrice;
            }

            $discount = (float) ($validated['discount'] ?? 0);
            $tax = (float) ($validated['tax'] ?? 0);
            $total = round($subtotal - $discount + $tax, 2);

            $invoiceNo = $this->nextInvoiceNo($organization);

            $sale = PosSale::query()->create([
                'organization_id' => $organization->id,
                'invoice_no' => $invoiceNo,
                'sale_date' => now()->toDateString(),
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_phone' => $validated['customer_phone'] ?? null,
                'subtotal' => round($subtotal, 2),
                'discount' => $discount,
                'tax' => $tax,
                'total_amount' => $total,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $validated['payment_status'],
                'notes' => $validated['notes'] ?? null,
                'cashier_id' => $user->id,
            ]);

            foreach ($items as $entry) {
                PosSaleItem::query()->create([
                    'pos_sale_id' => $sale->id,
                    'inventory_item_id' => $entry['item']->id,
                    'item_name' => $entry['item']->name,
                    'unit' => $entry['item']->unit,
                    'unit_price' => $entry['unitPrice'],
                    'quantity' => $entry['quantity'],
                    'amount' => round($entry['quantity'] * $entry['unitPrice'], 2),
                ]);
            }
        });

        return back()->with('success', "Sale {$this->lastInvoiceNo($organization)} recorded.");
    }

    public function destroySale(Request $request, PosSale $posSale): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($posSale->organization_id === $organization->id, 404);

        DB::transaction(function () use ($posSale) {
            foreach ($posSale->items as $item) {
                $inventory = InventoryItem::query()->find($item->inventory_item_id);
                if ($inventory) {
                    $inventory->increment('available_stock', $item->quantity);
                }
            }

            $posSale->delete();
        });

        return back()->with('success', 'Sale deleted and stock restored.');
    }

    private function salePayload(): callable
    {
        return function (PosSale $sale) {
            return [
                'id' => $sale->id,
                'invoiceNo' => $sale->invoice_no,
                'saleDate' => $sale->sale_date->toDateString(),
                'customerName' => $sale->customer_name,
                'customerPhone' => $sale->customer_phone,
                'subtotal' => (float) $sale->subtotal,
                'discount' => (float) $sale->discount,
                'tax' => (float) $sale->tax,
                'totalAmount' => (float) $sale->total_amount,
                'paymentMethod' => $sale->payment_method,
                'paymentStatus' => $sale->payment_status,
                'cashier' => $sale->cashier?->name,
                'notes' => $sale->notes,
                'items' => $sale->items->map(fn ($item) => [
                    'itemName' => $item->item_name,
                    'unit' => $item->unit,
                    'unitPrice' => (float) $item->unit_price,
                    'quantity' => $item->quantity,
                    'amount' => (float) $item->amount,
                ])->values(),
            ];
        };
    }

    private function nextInvoiceNo(Organization $organization): string
    {
        $count = PosSale::query()->where('organization_id', $organization->id)->count() + 1;

        return 'POS-'.now()->format('Ymd').'-'.str_pad((string) $count, 3, '0', STR_PAD_LEFT);
    }

    private function lastInvoiceNo(Organization $organization): string
    {
        return (string) PosSale::query()->where('organization_id', $organization->id)->latest('id')->value('invoice_no');
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