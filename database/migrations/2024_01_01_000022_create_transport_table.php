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
        Schema::create('transport_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('route_name');
            $table->string('route_number')->unique();
            $table->text('description')->nullable();
            $table->decimal('fare', 10, 2)->default(0);
            $table->json('stops')->nullable(); // Array of stops with timings
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('transport_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('route_id')->nullable()->constrained('transport_routes')->onDelete('set null');
            $table->string('vehicle_number')->unique();
            $table->string('vehicle_model')->nullable();
            $table->integer('capacity')->default(40);
            $table->foreignId('driver_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('driver_name')->nullable();
            $table->string('driver_phone')->nullable();
            $table->string('driver_license')->nullable();
            $table->date('insurance_expiry')->nullable();
            $table->date('fitness_expiry')->nullable();
            $table->enum('status', ['active', 'maintenance', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('student_transport', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('route_id')->constrained('transport_routes')->onDelete('cascade');
            $table->foreignId('vehicle_id')->nullable()->constrained('transport_vehicles')->onDelete('set null');
            $table->string('pickup_point');
            $table->string('drop_point')->nullable();
            $table->time('pickup_time')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_transport');
        Schema::dropIfExists('transport_vehicles');
        Schema::dropIfExists('transport_routes');
    }
};
