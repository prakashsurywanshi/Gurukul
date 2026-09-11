<?php

namespace App\Http\Controllers;

use App\Models\ContentFlag;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NsfwController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $query = ContentFlag::query()
            ->where('organization_id', $organization->id)
            ->with(['flagger:id,name,role', 'reviewer:id,name']);

        $status = $request->input('status');
        if ($status && in_array($status, ['pending', 'reviewed', 'dismissed'])) {
            $query->where('status', $status);
        }

        $flags = $query->orderByDesc('id')->get([
            'id',
            'item_type',
            'item_id',
            'reason',
            'notes',
            'status',
            'flagged_by',
            'reviewed_by',
            'reviewed_at',
            'created_at',
        ]);

        return Inertia::render('dashboard/NsfwModeration', [
            'user' => $user,
            'flags' => $flags,
            'stats' => [
                'pending' => ContentFlag::where('organization_id', $organization->id)->where('status', 'pending')->count(),
                'reviewed' => ContentFlag::where('organization_id', $organization->id)->where('status', 'reviewed')->count(),
                'dismissed' => ContentFlag::where('organization_id', $organization->id)->where('status', 'dismissed')->count(),
            ],
            'filters' => ['status' => $status ?? ''],
        ]);
    }

    public function review(Request $request, ContentFlag $flag): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($flag->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'action' => ['required', 'in:reviewed,dismissed'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $flag->update([
            'status' => $validated['action'],
            'notes' => $validated['notes'] ?? $flag->notes,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Flag status updated.');
    }

    public function store(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'item_type' => ['required', 'string', 'max:50'],
            'item_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'max:150'],
        ]);

        ContentFlag::create([
            'organization_id' => $organization->id,
            'flagged_by' => $request->user()->id,
            'item_type' => $validated['item_type'],
            'item_id' => $validated['item_id'],
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return back()->with('success', 'Content reported successfully.');
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

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        return $organization;
    }
}