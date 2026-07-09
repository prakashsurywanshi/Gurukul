<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('daily_trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->nullable()->constrained('transport_routes')->onDelete('set null');
            $table->foreignId('vehicle_id')->nullable()->constrained('transport_vehicles')->onDelete('set null');
            $table->enum('shift', ['morning', 'afternoon', 'evening'])->default('morning');
            $table->text('pickup_points')->nullable();
            $table->string('current_location')->nullable();
            $table->string('destination_point')->nullable();
            $table->time('departure_time')->nullable();
            $table->time('expected_arrival')->nullable();
            $table->string('supervisor')->nullable();
            $table->enum('trip_status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_trips');
    }
};
