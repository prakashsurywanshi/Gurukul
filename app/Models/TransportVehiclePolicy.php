<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportVehiclePolicy extends Model
{
    protected $fillable = [
        'organization_id',
        'vehicle_id',
        'academic_year_id',
        'bus_type',
        'roster_control',
        'boarding_control',
        'requires_roster_approval',
        'requires_fee_approval',
        'fee_ledger',
        'vendor_name',
        'vendor_contract_no',
        'vendor_valid_from',
        'vendor_valid_till',
        'vendor_contact',
        'notes',
    ];

    protected $casts = [
        'requires_roster_approval' => 'boolean',
        'requires_fee_approval' => 'boolean',
        'vendor_valid_from' => 'date',
        'vendor_valid_till' => 'date',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(TransportVehicle::class, 'vehicle_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Only the switches the manager actually stored. Everything else keeps
     * inheriting from the organization default or the preset.
     */
    public function overrides(): array
    {
        $payload = [];

        foreach (\App\Support\TransportPolicyPresets::KEYS as $key) {
            $value = $this->{$key};

            if ($value === null) {
                continue;
            }

            $payload[$key] = $value instanceof \DateTimeInterface
                ? $value->format('Y-m-d')
                : $value;
        }

        return $payload;
    }
}
