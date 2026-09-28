<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transport_vehicle_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->unique()->constrained('transport_vehicles')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('bus_type', ['school_owned', 'private_vendor'])->default('school_owned');
            $table->enum('roster_control', ['manager_only', 'driver_only', 'both'])->default('manager_only');
            $table->enum('boarding_control', ['driver_only', 'driver_and_manager', 'manager_only'])->default('driver_only');
            $table->boolean('requires_roster_approval')->default(false);
            $table->boolean('requires_fee_approval')->default(false);
            $table->enum('fee_ledger', ['school', 'vendor'])->default('school');

            $table->string('vendor_name')->nullable();
            $table->string('vendor_contract_no')->nullable();
            $table->date('vendor_valid_from')->nullable();
            $table->date('vendor_valid_till')->nullable();
            $table->string('vendor_contact')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_vehicle_policies');
    }
};
