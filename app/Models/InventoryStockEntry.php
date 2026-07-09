<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryStockEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'inventory_item_id',
        'inventory_supplier_id',
        'inventory_store_id',
        'quantity',
        'unit_price',
        'stock_date',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'float',
        'stock_date' => 'date',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(InventorySupplier::class, 'inventory_supplier_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(InventoryStore::class, 'inventory_store_id');
    }
}
