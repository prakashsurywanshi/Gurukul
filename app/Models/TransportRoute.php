<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransportRoute extends Model
{
    protected $table = 'transport_routes';

    protected $fillable = [
        'organization_id', 'academic_year_id', 'route_name', 'area', 'vehicle_number', 'route_number',
        'description', 'driver_name', 'driver_phone', 'driver_user_id', 'morning_pickup', 'afternoon_drop',
        'fare', 'monthly_fee', 'stops', 'status',
    ];

    protected $casts = [
        'stops' => 'array',
        'fare' => 'float',
        'monthly_fee' => 'float',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_user_id');
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(TransportVehicle::class, 'route_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TransportAssignment::class, 'route_id');
    }
}
