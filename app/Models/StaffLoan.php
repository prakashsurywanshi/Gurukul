<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffLoan extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'staff_user_id',
        'loan_reason',
        'principal_amount',
        'interest_rate',
        'tenure_months',
        'monthly_emi',
        'start_date',
        'paid_emis',
        'status',
        'approved_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'principal_amount' => 'decimal:2',
            'interest_rate' => 'decimal:2',
            'monthly_emi' => 'decimal:2',
            'tenure_months' => 'integer',
            'paid_emis' => 'integer',
            'start_date' => 'date',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}