<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportGpsPosition extends Model
{
    protected $table = 'transport_gps_positions';

    protected $fillable = [
        'organization_id',
        'daily_trip_id',
        'vehicle_id',
        'lat',
        'lng',
        'speed_kmh',
        'heading',
        'recorded_at',
        'created_by',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'speed_kmh' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(DailyTrip::class, 'daily_trip_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(TransportVehicle::class, 'vehicle_id');
    }
}