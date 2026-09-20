<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('super_admin_settings', function (Blueprint $table) {
            $table->text('biometric_sync_key')->nullable()->after('queue_worker_status');
            $table->text('cctv_sync_key')->nullable()->after('biometric_sync_key');
            $table->text('transport_gps_sync_key')->nullable()->after('cctv_sync_key');
        });
    }

    public function down(): void
    {
        Schema::table('super_admin_settings', function (Blueprint $table) {
            $table->dropColumn(['transport_gps_sync_key', 'cctv_sync_key', 'biometric_sync_key']);
        });
    }
};