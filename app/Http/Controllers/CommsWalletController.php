<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Models\WalletCredit;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CommsWalletController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $walletTypes = ['sms', 'email', 'whatsapp', 'notifications'];

        $balances = collect($walletTypes)->map(function (string $type) use ($organization) {
            $last = WalletCredit::query()
                ->where('organization_id', $organization->id)
                ->whereNull('staff_user_id')
                ->where('wallet_type', $type)
                ->latest('id')
                ->value('balance_after');

            return [
                'type' => $type,
                'balance' => (float) ($last ?? 0),
            ];
        });

        $perStaff = WalletCredit::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('staff_user_id')
            ->with('staff:id,name,role')
            ->latest('id')
            ->get()
            ->groupBy('staff_user_id')
            ->map(function ($entries) {
                $latest = $entries->first();

                return [
                    'staffName' => $latest->staff?->name ?? 'Staff #'.$latest->staff_user_id,
                    'staffRole' => RolePermissionCatalog::displayNameForSlug($latest->staff?->role ?? '') ?? $latest->staff?->role,
                    'walletType' => $latest->wallet_type,
                    'balance' => (float) $latest->balance_after,
                ];
            })
            ->values();

        $ledger = WalletCredit::query()
            ->where('organization_id', $organization->id)
            ->with('staff:id,name')
            ->latest('id')
            ->take(100)
            ->get()
            ->map(fn (WalletCredit $entry) => [
                'id' => $entry->id,
                'type' => $entry->wallet_type,
                'credits' => (float) $entry->credits,
                'transactionType' => $entry->transaction_type,
                'description' => $entry->description,
                'balanceAfter' => (float) $entry->balance_after,
                'staffName' => $entry->staff?->name,
            ]);

        return Inertia::render('dashboard/CommsWallet', [
            'balances' => $balances,
            'perStaff' => $perStaff,
            'ledger' => $ledger,
            'staffOptions' => $this->staffOptions($organization),
            'summary' => [
                'totalBalance' => (float) collect($walletTypes)->sum(function (string $type) use ($organization) {
                    return (float) (WalletCredit::query()->where('organization_id', $organization->id)->whereNull('staff_user_id')->where('wallet_type', $type)->latest('id')->value('balance_after') ?? 0);
                }),
                'lastTopup' => (float) WalletCredit::query()->where('organization_id', $organization->id)->where('transaction_type', 'credit')->latest('id')->value('credits') ?? 0,
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
            'wallet_type' => ['required', Rule::in(['sms', 'email', 'whatsapp', 'notifications'])],
            'credits' => ['required', 'numeric', 'gt:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'transaction_type' => ['required', Rule::in(['credit', 'debit'])],
        ]);

        $last = WalletCredit::query()
            ->where('organization_id', $organization->id)
            ->whereNull('staff_user_id')
            ->where('wallet_type', $validated['wallet_type'])
            ->latest('id')
            ->value('balance_after') ?? 0;

        $delta = $validated['transaction_type'] === 'credit' ? $validated['credits'] : -$validated['credits'];
        $balance = max(0, (float) $last + (float) $delta);

        WalletCredit::query()->create([
            'organization_id' => $organization->id,
            'wallet_type' => $validated['wallet_type'],
            'credits' => $validated['credits'],
            'transaction_type' => $validated['transaction_type'],
            'description' => $validated['description'] ?? null,
            'balance_after' => $balance,
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Wallet updated.');
    }

    public function giveCredits(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'staff_user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('organization_id', $organization->id)],
            'wallet_type' => ['required', Rule::in(['sms', 'email', 'whatsapp', 'notifications'])],
            'credits' => ['required', 'numeric', 'gt:0'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $last = WalletCredit::query()
            ->where('organization_id', $organization->id)
            ->where('staff_user_id', $validated['staff_user_id'])
            ->where('wallet_type', $validated['wallet_type'])
            ->latest('id')
            ->value('balance_after') ?? 0;

        WalletCredit::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $validated['staff_user_id'],
            'wallet_type' => $validated['wallet_type'],
            'credits' => $validated['credits'],
            'transaction_type' => 'credit',
            'description' => $validated['description'] ?? 'Allocated to staff',
            'balance_after' => (float) $last + (float) $validated['credits'],
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Credits allocated to staff.');
    }

    public function destroy(Request $request, WalletCredit $commsWalletEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($commsWalletEntry->organization_id === $organization->id, 404);

        $commsWalletEntry->delete();

        return back()->with('success', 'Wallet entry removed.');
    }

    private function staffOptions(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => RolePermissionCatalog::displayNameForSlug($user->role) ?? $user->role,
            ])
            ->values()
            ->all();
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