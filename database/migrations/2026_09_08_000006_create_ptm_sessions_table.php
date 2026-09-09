<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ptm_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('location')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('ptm_appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('ptm_session_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->string('parent_name')->nullable();
            $table->string('parent_contact')->nullable();
            $table->time('slot_time')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['booked', 'checked_in', 'completed', 'absent'])->default('booked');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['ptm_session_id', 'student_id']);
            $table->index(['ptm_session_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ptm_appointments');
        Schema::dropIfExists('ptm_sessions');
    }
};