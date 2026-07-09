<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'academic_year_id',
        'title',
        'category',
        'amount',
        'date',
        'payment_mode',
        'paid_to',
        'voucher_no',
        'notes',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }
}
