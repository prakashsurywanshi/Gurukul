<?php

namespace App\Http\Controllers;

use App\Models\ComplianceItem;
use App\Models\CompliancePack;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ComplianceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $packs = CompliancePack::query()
            ->where('organization_id', $organization->id)
            ->with('items')
            ->orderBy('category')
            ->orderBy('id')
            ->get();

        $items = $packs->flatMap(fn (CompliancePack $pack) => $pack->items->map(fn (ComplianceItem $item) => [
            'id' => $item->id,
            'packId' => $pack->id,
            'title' => $item->title,
            'description' => $item->description,
            'frequency' => $item->frequency,
            'dueDate' => $item->due_date?->toDateString(),
            'status' => $item->status,
            'verifiedAt' => $item->verified_at?->toDateString(),
            'overdue' => $item->status === 'pending' && $item->due_date?->lt(now()->startOfDay()),
        ]));

        $total = $items->count();
        $compliant = $items->where('status', 'compliant')->count();

        return Inertia::render('dashboard/Compliance', [
            'user' => $user,
            'packs' => $packs->map(fn (CompliancePack $pack) => [
                'id' => $pack->id,
                'name' => $pack->name,
                'category' => $pack->category,
                'description' => $pack->description,
                'status' => $pack->status,
                'itemCount' => $pack->items->count(),
                'compliantCount' => $pack->items->where('status', 'compliant')->count(),
            ])->values(),
            'items' => $items->values(),
            'summary' => [
                'packs' => $packs->count(),
                'totalItems' => $total,
                'compliant' => $compliant,
                'overdue' => $items->where('overdue', true)->count(),
                'dueThisMonth' => $items->filter(fn ($item) => $item['dueDate'] !== null && $item['status'] !== 'compliant' && (int) substr((string) $item['dueDate'], 0, 7) === now()->format('Y-m'))->count(),
                'completion' => $total > 0 ? round(($compliant / $total) * 100) : 0,
            ],
        ]);
    }

    public function calendar(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $items = ComplianceItem::query()
            ->where('organization_id', $organization->id)
            ->with('pack:id,name,category')
            ->whereNotNull('due_date')
            ->orderBy('due_date')
            ->take(500)
            ->get();

        $today = now()->startOfDay();

        $events = $items->map(fn (ComplianceItem $item) => [
            'id' => $item->id,
            'title' => $item->title,
            'pack' => $item->pack?->name,
            'category' => $item->pack?->category,
            'dueDate' => $item->due_date->toDateString(),
            'status' => $item->status,
            'overdue' => $item->status === 'pending' && $item->due_date->lt($today),
        ]);

        $todayString = $today->toDateString();

        $upcoming = $events
            ->filter(fn (array $event) => $event['status'] === 'pending' && $event['dueDate'] >= $todayString)
            ->sortBy('dueDate')
            ->take(10)
            ->values();

        return Inertia::render('dashboard/ComplianceCalendar', [
            'user' => $user,
            'events' => $events->values()->all(),
            'upcoming' => $upcoming->all(),
            'summary' => [
                'events' => $events->count(),
                'overdue' => $events->where('overdue', true)->count(),
                'dueThisMonth' => $events->filter(fn (array $event) => substr($event['dueDate'], 0, 7) === now()->format('Y-m') && $event['status'] === 'pending')->count(),
            ],
        ]);
    }

    public function storePack(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['active', 'archived'])],
        ]);

        CompliancePack::query()->create($validated + ['organization_id' => $organization->id]);

        return back()->with('success', 'Compliance pack added.');
    }

    public function storeItem(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'compliance_pack_id' => ['required', 'integer', Rule::exists('compliance_packs', 'id')->where('organization_id', $organization->id)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'frequency' => ['required', Rule::in(['once', 'monthly', 'quarterly', 'yearly'])],
            'due_date' => ['nullable', 'date'],
        ]);

        ComplianceItem::query()->create($validated + [
            'organization_id' => $organization->id,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Compliance checklist item added.');
    }

    public function updateItem(Request $request, ComplianceItem $item): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($item->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'compliant'])],
        ]);

        $item->update([
            'status' => $validated['status'],
            'verified_at' => $validated['status'] === 'compliant' ? now()->toDateString() : null,
        ]);

        return back()->with('success', 'Compliance item updated.');
    }

    public function destroyItem(Request $request, ComplianceItem $item): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($item->organization_id === $organization->id, 404);

        $item->delete();

        return back()->with('success', 'Compliance item removed.');
    }

    public function destroyPack(Request $request, CompliancePack $pack): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($pack->organization_id === $organization->id, 404);

        $pack->delete();

        return back()->with('success', 'Compliance pack removed.');
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