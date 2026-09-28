<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_routes', function (Blueprint $table) {
            $table->foreignId('driver_user_id')->nullable()->after('driver_phone')->constrained('users')->nullOnDelete();
        });

        $this->backfillVehicleDrivers();
        $this->backfillRouteDrivers();
    }

    private function backfillVehicleDrivers(): void
    {
        $driverUsers = DB::table('users')
            ->where('role', 'driver')
            ->whereNotNull('organization_id')
            ->get(['id', 'organization_id', 'name', 'phone']);

        DB::table('transport_vehicles')
            ->select('id', 'organization_id', 'driver_name', 'assigned_driver', 'driver_phone', 'driver_id')
            ->orderBy('id')
            ->chunkById(200, function ($vehicles) use ($driverUsers) {
                foreach ($vehicles as $vehicle) {
                    if (! empty($vehicle->driver_id)) {
                        continue;
                    }

                    $driver = $driverUsers->first(function ($candidate) use ($vehicle) {
                        if ((int) $candidate->organization_id !== (int) $vehicle->organization_id) {
                            return false;
                        }

                        $name = trim((string) ($vehicle->assigned_driver ?: $vehicle->driver_name));
                        $nameMatches = $name !== '' && strcasecmp(trim($candidate->name), $name) === 0;
                        $phoneMatches = false;

                        if ($vehicle->driver_phone && $candidate->phone) {
                            $phoneMatches = preg_replace('/\D+/', '', (string) $vehicle->driver_phone)
                                === preg_replace('/\D+/', '', (string) $candidate->phone);
                        }

                        return $nameMatches || $phoneMatches;
                    });

                    if ($driver) {
                        DB::table('transport_vehicles')
                            ->where('id', $vehicle->id)
                            ->update(['driver_id' => $driver->id]);
                    }
                }
            });
    }

    private function backfillRouteDrivers(): void
    {
        $driverUsers = DB::table('users')
            ->where('role', 'driver')
            ->whereNotNull('organization_id')
            ->get(['id', 'organization_id', 'name', 'phone']);

        DB::table('transport_routes')
            ->select('id', 'organization_id', 'driver_name', 'driver_phone')
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '')
            ->orderBy('id')
            ->chunkById(200, function ($routes) use ($driverUsers) {
                foreach ($routes as $route) {
                    $driver = $driverUsers->first(function ($candidate) use ($route) {
                        if ((int) $candidate->organization_id !== (int) $route->organization_id) {
                            return false;
                        }

                        $nameMatches = strcasecmp(trim($candidate->name), trim((string) $route->driver_name)) === 0;
                        $phoneMatches = false;

                        if ($route->driver_phone && $candidate->phone) {
                            $phoneMatches = preg_replace('/\D+/', '', (string) $route->driver_phone)
                                === preg_replace('/\D+/', '', (string) $candidate->phone);
                        }

                        return $nameMatches || $phoneMatches;
                    });

                    if ($driver) {
                        DB::table('transport_routes')
                            ->where('id', $route->id)
                            ->update(['driver_user_id' => $driver->id]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('transport_routes', function (Blueprint $table) {
            $table->dropForeign(['driver_user_id']);
            $table->dropColumn('driver_user_id');
        });
    }
};