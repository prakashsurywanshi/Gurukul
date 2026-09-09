<?php

namespace App\Http\Controllers;

use App\Models\AccountTransaction;
use App\Models\BankAccount;
use App\Models\Organization;
use App\Models\User;
use App\Services\AccountTransactionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class BankAccountController extends Controller
{
    public function __construct(private readonly AccountTransactionService $accountTransactionService)
    {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return inertia('dashboard/BankAccounts', [
                'user' => $user,
                'organization' => null,
                'accounts' => [],
                'transactions' => [],
                'summary' => ['opening' => 0, 'income' => 0, 'expense' => 0, 'fees' => 0, 'balance' => 0],
                'filters' => [],
            ]);
        }

        $validated = $request->validate([
            'accountId' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::in(['income', 'expense', 'fee_payment', 'adjustment'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $accounts = BankAccount::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->get();

        $query = AccountTransaction::query()
            ->where('organization_id', $organization->id)
            ->with('bankAccount:id,account_name,bank_name')
            ->with('creator:id,name')
            ->latest('transaction_date')
            ->latest('id');

        if (! empty($validated['accountId'])) {
            $query->where('bank_account_id', $validated['accountId']);
        }

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('transaction_date', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('transaction_date', '<=', $validated['to']);
        }

        $transactions = $query->paginate(50)->withQueryString();

        $summary = [
            'income' => (float) AccountTransaction::query()->where('organization_id', $organization->id)->where('type', 'income')->sum('amount'),
            'expense' => (float) AccountTransaction::query()->where('organization_id', $organization->id)->where('type', 'expense')->sum('amount'),
            'fees' => (float) AccountTransaction::query()->where('organization_id', $organization->id)->where('type', 'fee_payment')->sum('amount'),
            'opening' => (float) $accounts->sum('opening_balance'),
            'balance' => (float) $accounts->sum('current_balance'),
        ];

        return inertia('dashboard/BankAccounts', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ],
            'accounts' => $accounts->map(fn (BankAccount $account) => [
                'id' => (string) $account->id,
                'accountName' => $account->account_name,
                'bankName' => $account->bank_name,
                'branch' => $account->branch,
                'accountHolder' => $account->account_holder,
                'accountNumber' => $account->account_number,
                'ifscCode' => $account->ifsc_code,
                'openingBalance' => (float) $account->opening_balance,
                'currentBalance' => (float) $account->current_balance,
                'isDefault' => (bool) $account->is_default,
            ])->values()->all(),
            'transactions' => [
                'data' => $transactions->map(fn (AccountTransaction $entry) => [
                    'id' => (string) $entry->id,
                    'type' => $entry->type,
                    'amount' => (float) $entry->amount,
                    'balanceAfter' => (float) $entry->balance_after,
                    'description' => $entry->description,
                    'date' => optional($entry->transaction_date)->toDateString(),
                    'account' => $entry->bankAccount ? trim($entry->bankAccount->account_name.' - '.$entry->bankAccount->bank_name) : null,
                    'createdBy' => $entry->creator?->name ?? 'System',
                ])->all(),
                'total' => $transactions->total(),
                'currentPage' => $transactions->currentPage(),
                'lastPage' => $transactions->lastPage(),
                'perPage' => $transactions->perPage(),
            ],
            'summary' => $summary,
            'filters' => $validated,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'accountName' => ['required', 'string', 'max:255'],
            'bankName' => ['required', 'string', 'max:255'],
            'branch' => ['nullable', 'string', 'max:255'],
            'accountHolder' => ['required', 'string', 'max:255'],
            'accountNumber' => ['required', 'string', 'max:100'],
            'ifscCode' => ['nullable', 'string', 'max:50'],
            'openingBalance' => ['nullable', 'numeric', 'min:0'],
        ]);

        $hasAccounts = BankAccount::query()->where('organization_id', $organization->id)->exists();

        BankAccount::query()->create(array_merge([
            'organization_id' => $organization->id,
            'account_name' => $validated['accountName'],
            'bank_name' => $validated['bankName'],
            'branch' => $validated['branch'] ?? null,
            'account_holder' => $validated['accountHolder'],
            'account_number' => $validated['accountNumber'],
            'ifsc_code' => $validated['ifscCode'] ?? null,
            'opening_balance' => $validated['openingBalance'] ?? 0,
            'current_balance' => $validated['openingBalance'] ?? 0,
            'is_default' => ! $hasAccounts,
            'status' => 'active',
        ]));

        return redirect()->route('bank-accounts')->with('success', 'Bank account created successfully.');
    }

    public function update(Request $request, BankAccount $bankAccount): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $bankAccount->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'accountName' => ['required', 'string', 'max:255'],
            'bankName' => ['required', 'string', 'max:255'],
            'branch' => ['nullable', 'string', 'max:255'],
            'accountHolder' => ['required', 'string', 'max:255'],
            'accountNumber' => ['required', 'string', 'max:100'],
            'ifscCode' => ['nullable', 'string', 'max:50'],
        ]);

        $bankAccount->update([
            'account_name' => $validated['accountName'],
            'bank_name' => $validated['bankName'],
            'branch' => $validated['branch'] ?? null,
            'account_holder' => $validated['accountHolder'],
            'account_number' => $validated['accountNumber'],
            'ifsc_code' => $validated['ifscCode'] ?? null,
        ]);

        return redirect()->route('bank-accounts')->with('success', 'Bank account updated successfully.');
    }

    public function destroy(BankAccount $bankAccount): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $bankAccount->organization_id === $organization->id, 403);

        if (AccountTransaction::query()->where('bank_account_id', $bankAccount->id)->exists()) {
            return redirect()->route('bank-accounts')->with('error', 'Cannot delete an account that already has transactions.');
        }

        $bankAccount->delete();

        return redirect()->route('bank-accounts')->with('success', 'Bank account deleted successfully.');
    }

    public function setDefault(BankAccount $bankAccount): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());
        abort_unless($organization && $bankAccount->organization_id === $organization->id, 403);

        BankAccount::query()
            ->where('organization_id', $organization->id)
            ->update(['is_default' => false]);

        $bankAccount->update(['is_default' => true]);

        return redirect()->route('bank-accounts')->with('success', 'Default bank account updated.');
    }

    public function storeTransaction(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'bankAccountId' => ['required', 'integer'],
            'type' => ['required', Rule::in(['income', 'expense', 'adjustment'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:1000'],
            'transactionDate' => ['required', 'date'],
        ]);

        $account = BankAccount::query()
            ->where('organization_id', $organization->id)
            ->find($validated['bankAccountId']);

        if (! $account) {
            return redirect()->route('bank-accounts')->with('error', 'Selected bank account was not found.');
        }

        $this->accountTransactionService->record($organization, $account, $validated['type'], (float) $validated['amount'], [
            'description' => $validated['description'] ?? null,
            'transaction_date' => $validated['transactionDate'],
            'created_by' => $user->id,
        ]);

        return redirect()->route('bank-accounts')->with('success', 'Transaction recorded successfully.');
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
        }

        return $organization;
    }
}