<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('online_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('online_exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->string('exam_title');
            $table->string('subject')->nullable();
            $table->string('class_name')->nullable();
            $table->string('section')->nullable();
            $table->dateTime('started_at');
            $table->dateTime('submitted_at');
            $table->enum('status', ['submitted', 'auto_submitted'])->default('submitted');
            $table->json('answers')->nullable();
            $table->json('question_order')->nullable();
            $table->unsignedInteger('total_questions')->default(0);
            $table->unsignedInteger('attempted_questions')->default(0);
            $table->unsignedInteger('correct_answers')->default(0);
            $table->unsignedInteger('wrong_answers')->default(0);
            $table->unsignedInteger('unanswered_questions')->default(0);
            $table->decimal('total_marks', 10, 2)->default(0);
            $table->decimal('obtained_marks', 10, 2)->default(0);
            $table->decimal('negative_marks_applied', 10, 2)->default(0);
            $table->decimal('percentage', 10, 2)->default(0);
            $table->timestamps();

            $table->index(['online_exam_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('online_exam_attempts');
    }
};
