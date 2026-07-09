<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffPayrollEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'payroll_month',
        'base_pay',
        'allowance',
        'deduction',
        'status',
        'prepared_by',
    ];

    protected $casts = [
        'payroll_month' => 'date',
        'base_pay' => 'decimal:2',
        'allowance' => 'decimal:2',
        'deduction' => 'decimal:2',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }
}
