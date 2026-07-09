<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('online_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('subject')->nullable();
            $table->string('class_name')->nullable();
            $table->string('section')->nullable();
            $table->unsignedInteger('duration')->default(60);
            $table->dateTime('start_time')->nullable();
            $table->dateTime('end_time')->nullable();
            $table->boolean('negative_marking_enabled')->default(false);
            $table->decimal('negative_marks', 8, 2)->default(0);
            $table->boolean('shuffle_questions')->default(false);
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->json('questions');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('online_exams');
    }
};
