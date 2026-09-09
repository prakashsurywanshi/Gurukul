<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeStructure extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'academic_year_id',
        'class_id',
        'fee_type',
        'amount',
        'frequency',
        'description',
        'is_compulsory',
        'applicable_from',
        'applicable_to',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_compulsory' => 'boolean',
        'applicable_from' => 'date',
        'applicable_to' => 'date',
    ];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }
}
