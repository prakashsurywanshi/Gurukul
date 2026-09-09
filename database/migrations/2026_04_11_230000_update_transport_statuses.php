<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // Update trip_status enum to include 'running' and 'delayed'
        DB::statement("ALTER TABLE daily_trips MODIFY trip_status ENUM('scheduled', 'running', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'scheduled'");

        // Update student_transport status enum to include 'pending' and 'paused'
        DB::statement("ALTER TABLE student_transport MODIFY status ENUM('active', 'inactive', 'pending', 'paused') DEFAULT 'active'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // Revert to original enums
        DB::statement("ALTER TABLE daily_trips MODIFY trip_status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled'");
        DB::statement("ALTER TABLE student_transport MODIFY status ENUM('active', 'inactive') DEFAULT 'active'");
    }
};