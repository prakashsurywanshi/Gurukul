<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'asset_code',
        'category',
        'subcategory',
        'purchase_date',
        'purchase_cost',
        'current_value',
        'depreciation_rate',
        'status',
        'condition',
        'location',
        'assigned_to',
        'vendor',
        'serial_number',
        'notes',
        'disposal_date',
        'disposal_sale_price',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'purchase_cost' => 'decimal:2',
        'current_value' => 'decimal:2',
        'depreciation_rate' => 'decimal:2',
        'disposal_date' => 'date',
        'disposal_sale_price' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(AssetMaintenanceLog::class);
    }
}