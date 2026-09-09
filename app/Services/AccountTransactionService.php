<?php

namespace App\Services;

use App\Models\AccountTransaction;
use App\Models\BankAccount;
use App\Models\Organization;
use Illuminate\Support\Facades\DB;

class AccountTransactionService
{
    public function record(
        Organization $organization,
        BankAccount $account,
        string $type,
        float $amount,
        array $options = []
    ): ?AccountTransaction {
        if (! in_array($type, ['income', 'expense', 'fee_payment', 'adjustment'], true)) {
            return null;
        }

        $delta = in_array($type, ['income', 'fee_payment'], true) ? $amount : -$amount;

        return DB::transaction(function () use ($organization, $account, $type, $amount, $delta, $options) {
            $account->forceFill([
                'current_balance' => max(0, (float) $account->current_balance + $delta),
            ])->save();

            return AccountTransaction::query()->create([
                'organization_id' => $organization->id,
                'bank_account_id' => $account->id,
                'type' => $type,
                'amount' => $amount,
                'balance_after' => (float) $account->fresh()->current_balance,
                'description' => $options['description'] ?? null,
                'transaction_date' => $options['transaction_date'] ?? now()->toDateString(),
                'reference_type' => $options['reference_type'] ?? null,
                'reference_id' => $options['reference_id'] ?? null,
                'created_by' => $options['created_by'] ?? null,
            ]);
        });
    }

    public function defaultAccount(Organization $organization): ?BankAccount
    {
        return BankAccount::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();
    }
}