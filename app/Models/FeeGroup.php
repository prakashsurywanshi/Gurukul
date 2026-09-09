<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FeeGroup extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'status',
        'sort_order',
    ];

    public function feeTypes(): BelongsToMany
    {
        return $this->belongsToMany(FeeType::class, 'fee_group_fee_type')
            ->withTimestamps();
    }
}