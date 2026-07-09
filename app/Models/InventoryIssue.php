<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryIssue extends Model
{
    protected $fillable = [
        'organization_id',
        'inventory_item_id',
        'issued_to',
        'quantity',
        'issue_date',
        'return_date',
        'status',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'issue_date' => 'date',
        'return_date' => 'date',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}
