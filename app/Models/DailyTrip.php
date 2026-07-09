<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyTrip extends Model
{
    protected $table = 'daily_trips';

    protected $fillable = [
        'academic_year_id', 'route_id', 'vehicle_id', 'driver_user_id', 'shift', 'journey_date',
        'direction', 'pickup_points', 'current_location', 'current_stop', 'destination_point',
        'departure_time', 'expected_arrival', 'started_at', 'ended_at', 'stop_updates',
        'supervisor', 'trip_status', 'note',
    ];

    protected $casts = [
        'journey_date' => 'date',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'stop_updates' => 'array',
    ];

    public function route()
    {
        return $this->belongsTo(TransportRoute::class, 'route_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(TransportVehicle::class, 'vehicle_id');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_user_id');
    }
}
