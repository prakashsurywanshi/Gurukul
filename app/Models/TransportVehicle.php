<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransportVehicle extends Model
{
    protected $table = 'transport_vehicles';

    protected $fillable = [
        'organization_id', 'academic_year_id', 'route_id', 'vehicle_number', 'vehicle_type', 'vehicle_model',
        'capacity', 'driver_id', 'assigned_driver', 'driver_name', 'driver_phone',
        'driver_license', 'gps_device_id', 'insurance_expiry', 'fitness_expiry', 'status',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'insurance_expiry' => 'date',
        'fitness_expiry' => 'date',
    ];

    public function route()
    {
        return $this->belongsTo(TransportRoute::class, 'route_id');
    }
}
