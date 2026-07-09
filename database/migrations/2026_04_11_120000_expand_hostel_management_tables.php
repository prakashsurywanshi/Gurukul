<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hostel_rooms', function (Blueprint $table) {
            $table->string('floor')->nullable()->after('room_number');
        });

        Schema::create('hostel_beds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hostel_id')->constrained()->onDelete('cascade');
            $table->foreignId('room_id')->constrained('hostel_rooms')->onDelete('cascade');
            $table->string('bed_number');
            $table->enum('status', ['available', 'occupied', 'maintenance'])->default('available');
            $table->timestamps();

            $table->unique(['room_id', 'bed_number']);
        });

        Schema::table('hostel_allocations', function (Blueprint $table) {
            $table->foreignId('bed_id')->nullable()->after('room_id')->constrained('hostel_beds')->nullOnDelete();
        });

        Schema::create('hostel_fee_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('hostel_id')->constrained()->onDelete('cascade');
            $table->string('room_type');
            $table->decimal('amount', 10, 2);
            $table->enum('frequency', ['monthly', 'quarterly', 'yearly'])->default('monthly');
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hostel_fee_structures');

        Schema::table('hostel_allocations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bed_id');
        });

        Schema::dropIfExists('hostel_beds');

        Schema::table('hostel_rooms', function (Blueprint $table) {
            $table->dropColumn('floor');
        });
    }
};
