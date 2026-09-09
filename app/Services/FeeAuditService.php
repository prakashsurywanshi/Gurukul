<?php

namespace App\Services;

use App\Models\FeeAudit;
use App\Models\Organization;
use App\Models\User;

class FeeAuditService
{
    public function log(
        Organization $organization,
        string $action,
        ?User $user = null,
        array $attributes = []
    ): FeeAudit {
        return FeeAudit::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user?->id,
            'action' => $action,
            'amount' => $attributes['amount'] ?? null,
            'student_id' => $attributes['student_id'] ?? null,
            'student_fee_id' => $attributes['student_fee_id'] ?? null,
            'fee_payment_id' => $attributes['fee_payment_id'] ?? null,
            'meta' => $attributes['meta'] ?? [],
            'ip_address' => request()->ip(),
        ]);
    }
}