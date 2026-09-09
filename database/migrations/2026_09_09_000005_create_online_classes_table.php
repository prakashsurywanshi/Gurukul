<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('online_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id')->nullable();
            $table->foreignId('subject_id')->nullable();
            $table->string('title');
            $table->enum('provider', ['zoom', 'google_meet', 'microsoft_teams', 'custom'])->default('google_meet');
            $table->string('meeting_url')->nullable();
            $table->string('meeting_id')->nullable();
            $table->string('passcode')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->enum('status', ['scheduled', 'live', 'completed', 'cancelled'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('online_classes');
    }
};