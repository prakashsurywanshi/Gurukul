<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HostelRoomType extends Model
{
    public const SYSTEM_DEFAULTS = [
        ['name' => 'single', 'label' => 'Single', 'capacity' => 1],
        ['name' => 'double', 'label' => 'Double', 'capacity' => 2],
        ['name' => 'triple', 'label' => 'Triple', 'capacity' => 3],
        ['name' => 'dormitory', 'label' => 'Dormitory', 'capacity' => 8],
    ];

    protected $fillable = [
        'organization_id',
        'name',
        'label',
        'default_capacity',
        'default_fee',
        'is_system',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'default_capacity' => 'integer',
        'default_fee' => 'decimal:2',
        'is_system' => 'boolean',
        'status' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public static function resolvedNames(int $organizationId): array
    {
        return array_values(array_unique([
            ...array_column(self::SYSTEM_DEFAULTS, 'name'),
            ...self::query()
                ->where('organization_id', $organizationId)
                ->where('status', true)
                ->orderBy('sort_order')
                ->pluck('name')
                ->all(),
        ]));
    }
}