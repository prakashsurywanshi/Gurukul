<?php

namespace App\Support;

use App\Models\Organization;

class TransportPolicyPresets
{
    public const BUS_TYPES = ['school_owned', 'private_vendor'];

    public const ROSTER_CONTROLS = ['manager_only', 'driver_only', 'both'];

    public const BOARDING_CONTROLS = ['driver_only', 'driver_and_manager', 'manager_only'];

    public const FEE_LEDGERS = ['school', 'vendor'];

    /**
     * The switch set without any preset values applied. Presets only fill in
     * the keys they care about, so an unset key always falls back to the
     * organization default and finally to the school-owned preset.
     */
    public const KEYS = [
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

    public static function schoolOwned(): array
    {
        return [
            'bus_type' => 'school_owned',
            'roster_control' => 'manager_only',
            'boarding_control' => 'driver_only',
            'requires_roster_approval' => false,
            'requires_fee_approval' => false,
            'fee_ledger' => 'school',
            'vendor_name' => null,
            'vendor_contract_no' => null,
            'vendor_valid_from' => null,
            'vendor_valid_till' => null,
            'vendor_contact' => null,
            'notes' => null,
        ];
    }

    public static function privateVendor(): array
    {
        return [
            'bus_type' => 'private_vendor',
            'roster_control' => 'driver_only',
            'boarding_control' => 'driver_only',
            'requires_roster_approval' => true,
            'requires_fee_approval' => true,
            'fee_ledger' => 'vendor',
            'vendor_name' => null,
            'vendor_contract_no' => null,
            'vendor_valid_from' => null,
            'vendor_valid_till' => null,
            'vendor_contact' => null,
            'notes' => null,
        ];
    }

    public static function forBusType(string $busType): array
    {
        return $busType === 'private_vendor' ? self::privateVendor() : self::schoolOwned();
    }

    public static function organizationDefault(?Organization $organization): array
    {
        $stored = $organization ? data_get($organization->settings, 'transport.vehicle_policy') : null;

        return is_array($stored) ? array_intersect_key($stored, array_flip(self::KEYS)) : [];
    }

    /**
     * Vehicle row wins, then the organization default, then the preset for the
     * resolved bus type, then the school-owned preset as the final floor.
     */
    public static function resolve(?array $vehiclePolicy, ?Organization $organization): array
    {
        $vehiclePolicy = is_array($vehiclePolicy)
            ? array_intersect_key($vehiclePolicy, array_flip(self::KEYS))
            : [];

        $merged = array_merge(
            self::organizationDefault($organization),
            $vehiclePolicy,
        );

        $busType = in_array($merged['bus_type'] ?? null, self::BUS_TYPES, true)
            ? $merged['bus_type']
            : 'school_owned';

        $resolved = array_merge(self::schoolOwned(), self::forBusType($busType), $merged);

        $resolved['bus_type'] = $busType;
        $resolved['roster_control'] = in_array($resolved['roster_control'] ?? null, self::ROSTER_CONTROLS, true)
            ? $resolved['roster_control']
            : 'manager_only';
        $resolved['boarding_control'] = in_array($resolved['boarding_control'] ?? null, self::BOARDING_CONTROLS, true)
            ? $resolved['boarding_control']
            : 'driver_only';
        $resolved['fee_ledger'] = in_array($resolved['fee_ledger'] ?? null, self::FEE_LEDGERS, true)
            ? $resolved['fee_ledger']
            : 'school';

        $resolved['requires_roster_approval'] = (bool) $resolved['requires_roster_approval'];
        $resolved['requires_fee_approval'] = (bool) $resolved['requires_fee_approval'];

        $resolved['inherited'] = empty($vehiclePolicy);

        return $resolved;
    }
}
