<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('device_type')->default('fingerprint');
            $table->string('location')->nullable();
            $table->string('serial_number')->nullable();
            $table->string('api_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'name']);
        });

        Schema::create('biometric_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('biometric_device_id')->nullable()->constrained()->nullOnDelete();
            $table->string('log_type')->default('attendance');
            $table->string('person_type')->nullable();
            $table->string('person_name')->nullable();
            $table->string('uid')->nullable();
            $table->string('direction')->nullable();
            $table->boolean('matched')->default(true);
            $table->string('action')->nullable();
            $table->text('details')->nullable();
            $table->timestamp('event_time')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'log_type']);
            $table->index(['organization_id', 'event_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_logs');
        Schema::dropIfExists('biometric_devices');
    }
};