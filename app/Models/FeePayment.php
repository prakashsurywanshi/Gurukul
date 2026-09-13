<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeePayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_fee_id',
        'student_id',
        'receipt_number',
        'batch_reference',
        'amount',
        'payment_method',
        'transaction_id',
        'cheque_number',
        'cheque_date',
        'bank_name',
        'payment_date',
        'collected_by',
        'remarks',
        'status',
        'reverted_by',
        'reverted_at',
        'revert_reason',
        'reconciled_by',
        'reconciled_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
        'cheque_date' => 'date',
        'reverted_at' => 'date',
        'reconciled_at' => 'datetime',
    ];

    public function reconcileBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    public function studentFee(): BelongsTo
    {
        return $this->belongsTo(StudentFee::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }
}
