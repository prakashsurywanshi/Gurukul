<?php

namespace App\Http\Controllers;

use App\Models\AccountHead;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountHeadController extends Controller
{
    public function index(Request $request): Response
    {
        $type = $this->typeFromRoute($request->route()->getName());

        $organization = $this->resolveOrganizationForUser($request->user());

        return Inertia::render('dashboard/AccountHeads', [
            'user' => $request->user(),
            'type' => $type,
            'heads' => AccountHead::query()
                ->where('organization_id', $organization->id)
                ->where('type', $type)
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'status',
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $type = $this->typeFromRoute($request->route()->getName());

        $organization = $this->resolveOrganizationForUser($request->user());

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $head = AccountHead::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'type' => $type,
                'name' => $validated['name'],
            ],
            [
                'status' => 'active',
            ]
        );

        return back()->with(
            'success',
            $head->wasRecentlyCreated
                ? ucfirst($type).' head added successfully.'
                : ucfirst($type).' head already exists.'
        );
    }

    public function update(Request $request, AccountHead $accountHead): RedirectResponse
    {
        $type = $this->typeFromRoute($request->route()->getName());
        $ourType = $accountHead->type;

        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($accountHead->organization_id === $organization->id && $ourType === $type, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $duplicate = AccountHead::query()
            ->where('organization_id', $organization->id)
            ->where('type', $type)
            ->where('name', $validated['name'])
            ->where('id', '!=', $accountHead->id)
            ->exists();

        if ($duplicate) {
            return back()->with('error', ucfirst($type).' head with this name already exists.');
        }

        $accountHead->update([
            'name' => $validated['name'],
            'status' => $validated['status'] ?? $accountHead->status,
        ]);

        return back()->with('success', ucfirst($type).' head updated successfully.');
    }

    public function destroy(Request $request, AccountHead $accountHead): RedirectResponse
    {
        $type = $this->typeFromRoute($request->route()->getName());

        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($accountHead->organization_id === $organization->id && $accountHead->type === $type, 404);

        $accountHead->delete();

        return back()->with('success', ucfirst($type).' head deleted successfully.');
    }

    private function typeFromRoute(?string $routeName): string
    {
        $type = str_contains($routeName ?? '', 'expense') ? 'expense' : 'income';

        return $type;
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