<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryStore extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'manager',
        'location',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }
}
