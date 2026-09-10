<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompliancePack extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'category',
        'description',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ComplianceItem::class)->orderBy('due_date')->orderBy('id');
    }
}