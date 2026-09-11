<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiometricLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'biometric_device_id',
        'log_type',
        'person_type',
        'person_name',
        'uid',
        'direction',
        'matched',
        'action',
        'details',
        'event_time',
    ];

    protected function casts(): array
    {
        return [
            'matched' => 'boolean',
            'event_time' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(BiometricDevice::class, 'biometric_device_id');
    }
}