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
        Schema::create('transport_boarding_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('daily_trip_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->enum('direction', ['pickup', 'drop'])->default('pickup');
            $table->enum('status', ['pending', 'present', 'absent'])->default('pending');
            $table->timestamp('boarded_at')->nullable();
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['daily_trip_id', 'student_id', 'direction'], 'transport_boarding_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transport_boarding_records');
    }
};