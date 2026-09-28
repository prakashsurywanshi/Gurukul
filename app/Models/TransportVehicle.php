<?php

namespace App\Models;

use App\Support\TransportPolicyPresets;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'driver_id' => 'integer',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(TransportRoute::class, 'route_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function policy(): HasOne
    {
        return $this->hasOne(TransportVehiclePolicy::class, 'vehicle_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TransportAssignment::class, 'vehicle_id');
    }

    /**
     * The effective switch set: vehicle row, then organization default, then
     * the preset for the resolved bus type.
     */
    public function effectivePolicy(): array
    {
        $vehicle = $this->loadMissing('policy');

        return TransportPolicyPresets::resolve(
            $vehicle->policy?->overrides() ?? [],
            $vehicle->organization_id ? Organization::find($vehicle->organization_id) : null,
        );
    }

    /**
     * The driver who owns this bus. Falls back to the route's driver when the
     * vehicle has no driver_id, and finally to a name match on the vehicle
     * itself so legacy rows still resolve.
     */
    public function resolveDriverUser(): ?User
    {
        $this->loadMissing('route');

        if ($this->driver_id) {
            $driver = User::query()->find($this->driver_id);

            if ($driver?->role === 'driver') {
                return $driver;
            }
        }

        if ($this->route?->driver_user_id) {
            $routeDriver = User::query()->find($this->route->driver_user_id);

            if ($routeDriver?->role === 'driver') {
                return $routeDriver;
            }
        }

        if ($this->driver_name) {
            return User::query()
                ->where('role', 'driver')
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($this->driver_name)])
                ->orderBy('id')
                ->first();
        }

        return null;
    }
}
