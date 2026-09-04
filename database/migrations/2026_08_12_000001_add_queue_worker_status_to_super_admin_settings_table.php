<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('super_admin_settings', function (Blueprint $table) {
            $table->string('queue_worker_status', 20)->default('running')->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('super_admin_settings', function (Blueprint $table) {
            $table->dropColumn('queue_worker_status');
        });
    }
};
