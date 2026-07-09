<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Update trip_status enum to include 'running' and 'delayed'
        Schema::table('daily_trips', function (Blueprint $table) {
            // Note: For MySQL, we need to modify the column directly
            // Change the enum to include new values
            DB::statement("ALTER TABLE daily_trips MODIFY trip_status ENUM('scheduled', 'running', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'scheduled'");
        });

        // Update student_transport status enum to include 'pending' and 'paused'
        Schema::table('student_transport', function (Blueprint $table) {
            DB::statement("ALTER TABLE student_transport MODIFY status ENUM('active', 'inactive', 'pending', 'paused') DEFAULT 'active'");
        });
    }

    public function down(): void
    {
        // Revert to original enums
        DB::statement("ALTER TABLE daily_trips MODIFY trip_status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled'");
        DB::statement("ALTER TABLE student_transport MODIFY status ENUM('active', 'inactive') DEFAULT 'active'");
    }
};
