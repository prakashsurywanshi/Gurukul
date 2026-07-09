<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add missing columns to transport_routes
        Schema::table('transport_routes', function (Blueprint $table) {
            if (!Schema::hasColumn('transport_routes', 'area')) {
                $table->string('area')->nullable()->after('route_name');
            }
            if (!Schema::hasColumn('transport_routes', 'vehicle_number')) {
                $table->string('vehicle_number')->nullable()->after('area');
            }
            if (!Schema::hasColumn('transport_routes', 'driver_name')) {
                $table->string('driver_name')->nullable()->after('vehicle_number');
            }
            if (!Schema::hasColumn('transport_routes', 'driver_phone')) {
                $table->string('driver_phone')->nullable()->after('driver_name');
            }
            if (!Schema::hasColumn('transport_routes', 'morning_pickup')) {
                $table->time('morning_pickup')->nullable()->after('driver_phone');
            }
            if (!Schema::hasColumn('transport_routes', 'afternoon_drop')) {
                $table->time('afternoon_drop')->nullable()->after('morning_pickup');
            }
            if (!Schema::hasColumn('transport_routes', 'monthly_fee')) {
                $table->decimal('monthly_fee', 10, 2)->default(0)->after('afternoon_drop');
            }
        });

        // Add missing columns to transport_vehicles
        Schema::table('transport_vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('transport_vehicles', 'vehicle_type')) {
                $table->string('vehicle_type')->nullable()->after('vehicle_number');
            }
            if (!Schema::hasColumn('transport_vehicles', 'assigned_driver')) {
                $table->string('assigned_driver')->nullable()->after('driver_phone');
            }
            if (!Schema::hasColumn('transport_vehicles', 'gps_device_id')) {
                $table->string('gps_device_id')->nullable()->after('assigned_driver');
            }
        });

        // Expand student_transport table
        Schema::table('student_transport', function (Blueprint $table) {
            if (!Schema::hasColumn('student_transport', 'drop_time')) {
                $table->time('drop_time')->nullable()->after('pickup_time');
            }
            if (!Schema::hasColumn('student_transport', 'monthly_fee')) {
                $table->decimal('monthly_fee', 10, 2)->default(0)->after('drop_time');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transport_routes', function (Blueprint $table) {
            $table->dropColumn(['area', 'vehicle_number', 'driver_name', 'driver_phone', 'morning_pickup', 'afternoon_drop', 'monthly_fee']);
        });
        Schema::table('transport_vehicles', function (Blueprint $table) {
            $table->dropColumn(['vehicle_type', 'assigned_driver', 'gps_device_id']);
        });
        Schema::table('student_transport', function (Blueprint $table) {
            $table->dropColumn(['drop_time', 'monthly_fee']);
        });
    }
};
