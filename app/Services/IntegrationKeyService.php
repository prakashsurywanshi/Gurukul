<?php

namespace App\Services;

use App\Models\SuperAdminSetting;
use Illuminate\Support\Facades\Schema;

class IntegrationKeyService
{
    public const SERVICES = [
        'biometric' => 'biometric_sync_key',
        'cctv' => 'cctv_sync_key',
        'transport_gps' => 'transport_gps_sync_key',
    ];

    public function globalKey(string $service): ?string
    {
        $column = self::SERVICES[$service] ?? null;

        if ($column) {
            $storedKey = $this->storedKey($column);

            if (filled((string) $storedKey)) {
                return (string) $storedKey;
            }
        }

        $configKey = config('sync.keys.'.$service);

        if (filled((string) $configKey)) {
            return (string) $configKey;
        }

        return null;
    }

    public function hasGlobalKey(string $service): bool
    {
        return filled($this->globalKey($service));
    }

    private function storedKey(string $column): ?string
    {
        if (! Schema::hasTable('super_admin_settings')) {
            return null;
        }

        return SuperAdminSetting::query()->first()?->{$column};
    }
}