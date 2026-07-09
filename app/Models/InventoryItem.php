<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    protected $fillable = [
        'organization_id',
        'inventory_category_id',
        'inventory_store_id',
        'inventory_supplier_id',
        'name',
        'unit',
        'available_stock',
        'minimum_stock',
    ];

    protected $casts = [
        'available_stock' => 'integer',
        'minimum_stock' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(InventoryCategory::class, 'inventory_category_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(InventoryStore::class, 'inventory_store_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(InventorySupplier::class, 'inventory_supplier_id');
    }

    public function stockEntries(): HasMany
    {
        return $this->hasMany(InventoryStockEntry::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(InventoryIssue::class);
    }
}
