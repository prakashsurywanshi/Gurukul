<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\AssetMaintenanceLog;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));
        $category = trim((string) $request->query('category', ''));

        $assets = Asset::query()
            ->where('organization_id', $organization->id)
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('asset_code', 'like', "%{$search}%")->orWhere('serial_number', 'like', "%{$search}%")))
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        $categories = Asset::query()
            ->where('organization_id', $organization->id)
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        $totalCost = (float) Asset::query()->where('organization_id', $organization->id)->sum('purchase_cost');
        $currentValue = (float) Asset::query()->where('organization_id', $organization->id)->where('status', '!=', 'disposed')->sum('current_value');
        $disposed = Asset::query()->where('organization_id', $organization->id)->where('status', 'disposed')->count();
        $underMaintenance = Asset::query()->where('organization_id', $organization->id)->where('status', 'under_maintenance')->count();

        return inertia('dashboard/Assets', [
            'user' => $user,
            'assets' => $assets->map(fn (Asset $asset) => $this->payload($asset))->values()->all(),
            'filters' => ['search' => $search, 'status' => $status, 'category' => $category],
            'categories' => $categories->all(),
            'stats' => [
                'totalCost' => number_format($totalCost, 2),
                'currentValue' => number_format($currentValue, 2),
                'disposed' => $disposed,
                'underMaintenance' => $underMaintenance,
                'count' => $assets->where('status', '!=', 'disposed')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $this->validatedPayload($request);

        $asset = Asset::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'asset_code' => $this->uniqueAssetCode($organization, $validated['asset_code'] ?? ''),
            'category' => $validated['category'],
            'subcategory' => $validated['subcategory'] ?? null,
            'purchase_date' => $validated['purchase_date'] ?? null,
            'purchase_cost' => $validated['purchase_cost'] ?? 0,
            'current_value' => $validated['current_value'] ?? $validated['purchase_cost'] ?? 0,
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'status' => $validated['status'] ?? 'in_use',
            'condition' => $validated['condition'] ?? 'good',
            'location' => $validated['location'] ?? null,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'vendor' => $validated['vendor'] ?? null,
            'serial_number' => $validated['serial_number'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Asset "'.$asset->name.'" added.');
    }

    public function update(Request $request, Asset $asset): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $asset->organization_id === $organization->id, 403);

        $validated = $this->validatedPayload($request, $asset);

        $asset->update([
            'name' => $validated['name'],
            'asset_code' => $asset->asset_code ?: ($this->uniqueAssetCode($organization, $validated['asset_code'] ?? '')),
            'category' => $validated['category'],
            'subcategory' => $validated['subcategory'] ?? null,
            'purchase_date' => $validated['purchase_date'] ?? null,
            'purchase_cost' => $validated['purchase_cost'] ?? 0,
            'current_value' => $validated['current_value'] ?? $asset->current_value,
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'status' => $validated['status'] ?? $asset->status,
            'condition' => $validated['condition'] ?? 'good',
            'location' => $validated['location'] ?? null,
            'assigned_to' => $validated['assigned_to'] ?? null,
            'vendor' => $validated['vendor'] ?? null,
            'serial_number' => $validated['serial_number'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'disposal_date' => ($validated['status'] ?? '') === 'disposed' ? now() : null,
            'disposal_sale_price' => ($validated['status'] ?? '') === 'disposed' ? ($validated['disposal_sale_price'] ?? null) : null,
        ]);

        return back()->with('success', 'Asset "'.$asset->name.'" updated.');
    }

    public function destroy(Request $request, Asset $asset): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $asset->organization_id === $organization->id, 403);

        $name = $asset->name;
        $asset->delete();

        return back()->with('success', 'Asset "'.$name.'" deleted.');
    }

    public function maintenance(Request $request, Asset $asset): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $asset->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'maintenance_date' => ['required', 'date'],
            'maintenance_type' => ['required', 'string', 'max:50'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'performed_by' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        AssetMaintenanceLog::create([
            'organization_id' => $organization->id,
            'asset_id' => $asset->id,
            'maintenance_date' => $validated['maintenance_date'],
            'maintenance_type' => $validated['maintenance_type'],
            'cost' => $validated['cost'] ?? 0,
            'performed_by' => $validated['performed_by'] ?? $this->displayName($user),
            'notes' => $validated['notes'] ?? null,
        ]);

        $asset->update(['status' => 'under_maintenance']);

        return back()->with('success', 'Maintenance log recorded.');
    }

    private function validatedPayload(Request $request, ?Asset $asset = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'asset_code' => ['nullable', 'string', 'max:60'],
            'category' => ['required', 'string', 'max:90'],
            'subcategory' => ['nullable', 'string', 'max:90'],
            'purchase_date' => ['nullable', 'date'],
            'purchase_cost' => ['nullable', 'numeric', 'min:0'],
            'current_value' => ['nullable', 'numeric', 'min:0'],
            'depreciation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', Rule::in(['in_use', 'available', 'under_maintenance', 'disposed'])],
            'condition' => ['required', Rule::in(['new', 'good', 'fair', 'poor'])],
            'location' => ['nullable', 'string', 'max:120'],
            'assigned_to' => ['nullable', 'string', 'max:120'],
            'vendor' => ['nullable', 'string', 'max:120'],
            'serial_number' => ['nullable', 'string', 'max:90'],
            'notes' => ['nullable', 'string'],
            'disposal_sale_price' => ['nullable', 'numeric', 'min:0'],
        ]);
    }

    private function uniqueAssetCode(Organization $organization, string $preferred): string
    {
        $base = $preferred !== '' ? $preferred : 'AST-'.Str::upper(Str::random(6));
        $code = $base;
        $counter = 2;

        while (Asset::query()->where('organization_id', $organization->id)->where('asset_code', $code)->exists()) {
            $code = "{$base}-{$counter}";
            $counter++;
        }

        return $code;
    }

    private function displayName(User $user): string
    {
        return $user->name ?: $user->email;
    }

    private function payload(Asset $asset): array
    {
        return [
            'id' => $asset->id,
            'name' => $asset->name,
            'asset_code' => $asset->asset_code,
            'category' => $asset->category,
            'subcategory' => $asset->subcategory,
            'purchase_date' => optional($asset->purchase_date)->toDateString(),
            'purchase_cost' => number_format((float) $asset->purchase_cost, 2),
            'current_value' => number_format((float) $asset->current_value, 2),
            'depreciation_rate' => $asset->depreciation_rate !== null ? number_format((float) $asset->depreciation_rate, 2) : null,
            'status' => $asset->status,
            'condition' => $asset->condition,
            'location' => $asset->location,
            'assigned_to' => $asset->assigned_to,
            'vendor' => $asset->vendor,
            'serial_number' => $asset->serial_number,
            'notes' => $asset->notes,
            'disposal_date' => optional($asset->disposal_date)->toDateString(),
            'disposal_sale_price' => $asset->disposal_sale_price !== null ? number_format((float) $asset->disposal_sale_price, 2) : null,
            'maintenance_count' => $asset->maintenanceLogs()->count(),
            'maintenance_logs' => $asset->maintenanceLogs()->latest()->limit(10)->get()->map(fn (AssetMaintenanceLog $log) => [
                'id' => $log->id,
                'date' => $log->maintenance_date->toDateString(),
                'type' => $log->maintenance_type,
                'cost' => number_format((float) $log->cost, 2),
                'performed_by' => $log->performed_by,
                'notes' => $log->notes,
            ])->values()->all(),
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