<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('license_number')->nullable();
            $table->date('license_expiry_date')->nullable();
            $table->string('license_categories')->nullable();
            $table->date('joining_date')->nullable();
            $table->string('employment_type')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->string('blood_group')->nullable();
            $table->string('photo_path')->nullable();
            $table->enum('verification_status', ['verified', 'pending', 'rejected'])->default('pending');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->date('policy_expiry_date')->nullable();
            $table->string('policy_number')->nullable();
            $table->unique(['organization_id', 'user_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_profiles');
    }
};