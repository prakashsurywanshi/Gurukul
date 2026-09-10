<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'compliance_pack_id',
        'title',
        'description',
        'frequency',
        'due_date',
        'status',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
            'verified_at' => 'date:Y-m-d',
        ];
    }

    public function pack(): BelongsTo
    {
        return $this->belongsTo(CompliancePack::class, 'compliance_pack_id');
    }
}