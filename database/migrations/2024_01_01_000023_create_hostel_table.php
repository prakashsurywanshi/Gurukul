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
        Schema::create('hostels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->enum('type', ['boys', 'girls', 'mixed'])->default('boys');
            $table->text('address');
            $table->integer('total_rooms')->default(0);
            $table->foreignId('warden_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('warden_name')->nullable();
            $table->string('warden_phone')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('hostel_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hostel_id')->constrained()->onDelete('cascade');
            $table->string('room_number');
            $table->enum('room_type', ['single', 'double', 'triple', 'dormitory'])->default('double');
            $table->integer('capacity');
            $table->integer('occupied')->default(0);
            $table->decimal('monthly_fee', 10, 2)->default(0);
            $table->json('facilities')->nullable(); // AC, TV, Attached Bathroom, etc.
            $table->enum('status', ['available', 'full', 'maintenance'])->default('available');
            $table->timestamps();
            
            $table->unique(['hostel_id', 'room_number']);
        });

        Schema::create('hostel_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('hostel_id')->constrained()->onDelete('cascade');
            $table->foreignId('room_id')->constrained('hostel_rooms')->onDelete('cascade');
            $table->date('allocation_date');
            $table->date('departure_date')->nullable();
            $table->enum('status', ['active', 'vacated'])->default('active');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hostel_allocations');
        Schema::dropIfExists('hostel_rooms');
        Schema::dropIfExists('hostels');
    }
};
