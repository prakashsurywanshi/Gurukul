<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/VendorsPurchaseOrders', [
            'user' => $user,
            'vendors' => $this->vendors($organization),
            'orders' => $this->orders($organization),
            'nextPoNumbers' => $this->nextPoNumbers($organization),
            'metrics' => [
                'vendors' => Vendor::query()->where('organization_id', $organization->id)->where('status', 'active')->count(),
                'orders' => PurchaseOrder::query()->where('organization_id', $organization->id)->count(),
                'pending' => PurchaseOrder::query()->where('organization_id', $organization->id)->whereIn('status', ['draft', 'submitted', 'approved'])->sum('total_amount'),
            ],
        ]);
    }

    public function storeVendor(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:1000'],
            'category' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        Vendor::query()->create(['organization_id' => $organization->id, ...$validated]);

        return back()->with('success', 'Vendor created successfully.');
    }

    public function updateVendor(Request $request, Vendor $vendor): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($vendor->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:1000'],
            'category' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $vendor->update($validated);

        return back()->with('success', 'Vendor updated successfully.');
    }

    public function destroyVendor(Vendor $vendor): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($vendor->organization_id === $organization->id, 403);

        $vendor->delete();

        return back()->with('success', 'Vendor deleted successfully.');
    }

    public function storeOrder(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'po_number' => ['required', 'string', 'max:50'],
            'vendor_id' => ['required', 'integer', 'exists:vendors,id'],
            'order_date' => ['nullable', 'date'],
            'expected_delivery' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['draft', 'submitted', 'approved', 'received', 'cancelled'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.unit' => ['nullable', 'string', 'max:30'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $vendor = Vendor::query()->where('organization_id', $organization->id)->findOrFail($validated['vendor_id']);

        DB::transaction(function () use ($organization, $user, $validated, $vendor) {
            $total = 0;
            foreach ($validated['items'] as $item) {
                $total += $item['quantity'] * $item['unit_price'];
            }

            $order = PurchaseOrder::query()->create([
                'organization_id' => $organization->id,
                'vendor_id' => $vendor->id,
                'po_number' => $validated['po_number'],
                'order_date' => $validated['order_date'] ?? now()->toDateString(),
                'expected_delivery' => $validated['expected_delivery'] ?? null,
                'total_amount' => round($total, 2),
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseOrderItem::query()->create([
                    'purchase_order_id' => $order->id,
                    'item_name' => $item['item_name'],
                    'unit' => $item['unit'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'amount' => round($item['quantity'] * $item['unit_price'], 2),
                ]);
            }
        });

        return back()->with('success', 'Purchase order created successfully.');
    }

    public function setStatus(Request $request, PurchaseOrder $order): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($order->organization_id === $organization->id, 403);

        $validated = $request->validate(['status' => ['required', Rule::in(['draft', 'submitted', 'approved', 'received', 'cancelled'])]]);

        $order->update(['status' => $validated['status']]);

        return back()->with('success', 'Purchase order status updated.');
    }

    public function destroyOrder(PurchaseOrder $order): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($order->organization_id === $organization->id, 403);

        $order->delete();

        return back()->with('success', 'Purchase order deleted successfully.');
    }

    private function vendors(Organization $organization): array
    {
        return Vendor::query()
            ->where('organization_id', $organization->id)
            ->withCount('purchaseOrders')
            ->orderBy('name')
            ->get()
            ->map(fn (Vendor $vendor) => [
                'id' => (string) $vendor->id,
                'name' => $vendor->name,
                'contact_person' => $vendor->contact_person,
                'phone' => $vendor->phone,
                'email' => $vendor->email,
                'gstin' => $vendor->gstin,
                'address' => $vendor->address,
                'category' => $vendor->category,
                'status' => $vendor->status,
                'notes' => $vendor->notes,
                'orders_count' => $vendor->purchase_orders_count,
            ])
            ->all();
    }

    private function orders(Organization $organization): array
    {
        return PurchaseOrder::query()
            ->where('organization_id', $organization->id)
            ->with('vendor:id,name', 'items')
            ->orderByDesc('id')
            ->get()
            ->map(fn (PurchaseOrder $order) => [
                'id' => (string) $order->id,
                'po_number' => $order->po_number,
                'vendor' => $order->vendor?->name ?? '—',
                'vendor_id' => (string) $order->vendor_id,
                'order_date' => $order->order_date?->format('Y-m-d'),
                'expected_delivery' => $order->expected_delivery?->format('Y-m-d'),
                'total_amount' => number_format($order->total_amount, 2),
                'status' => $order->status,
                'notes' => $order->notes,
                'items' => $order->items->map(fn (PurchaseOrderItem $item) => [
                    'id' => (string) $item->id,
                    'item_name' => $item->item_name,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'unit_price' => number_format($item->unit_price, 2),
                    'amount' => number_format($item->amount, 2),
                ])->all(),
            ])
            ->all();
    }

    private function nextPoNumbers(Organization $organization): array
    {
        $last = PurchaseOrder::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->value('po_number');

        $next = 'PO-' . now()->format('Y') . '-0001';
        if ($last && preg_match('/PO-\d{4}-(\d+)/', (string) $last, $m)) {
            $next = 'PO-' . now()->format('Y') . '-' . str_pad((int) $m[1] + 1, 4, '0', STR_PAD_LEFT);
        }

        return [
            'draft' => $next,
            'submitted' => $next,
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}