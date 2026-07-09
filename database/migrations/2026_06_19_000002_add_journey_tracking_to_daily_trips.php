<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_trips', function (Blueprint $table) {
            if (! Schema::hasColumn('daily_trips', 'driver_user_id')) {
                $table->foreignId('driver_user_id')->nullable()->after('vehicle_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('daily_trips', 'journey_date')) {
                $table->date('journey_date')->nullable()->after('shift');
            }
            if (! Schema::hasColumn('daily_trips', 'direction')) {
                $table->string('direction')->default('pickup')->after('journey_date');
            }
            if (! Schema::hasColumn('daily_trips', 'current_stop')) {
                $table->string('current_stop')->nullable()->after('current_location');
            }
            if (! Schema::hasColumn('daily_trips', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('expected_arrival');
            }
            if (! Schema::hasColumn('daily_trips', 'ended_at')) {
                $table->timestamp('ended_at')->nullable()->after('started_at');
            }
            if (! Schema::hasColumn('daily_trips', 'stop_updates')) {
                $table->json('stop_updates')->nullable()->after('ended_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('daily_trips', function (Blueprint $table) {
            if (Schema::hasColumn('daily_trips', 'stop_updates')) {
                $table->dropColumn('stop_updates');
            }
            if (Schema::hasColumn('daily_trips', 'ended_at')) {
                $table->dropColumn('ended_at');
            }
            if (Schema::hasColumn('daily_trips', 'started_at')) {
                $table->dropColumn('started_at');
            }
            if (Schema::hasColumn('daily_trips', 'current_stop')) {
                $table->dropColumn('current_stop');
            }
            if (Schema::hasColumn('daily_trips', 'direction')) {
                $table->dropColumn('direction');
            }
            if (Schema::hasColumn('daily_trips', 'journey_date')) {
                $table->dropColumn('journey_date');
            }
            if (Schema::hasColumn('daily_trips', 'driver_user_id')) {
                $table->dropConstrainedForeignId('driver_user_id');
            }
        });
    }
};
