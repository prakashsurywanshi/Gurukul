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
        Schema::create('lesson_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('timetable_id')->nullable()->constrained('timetables')->nullOnDelete();
            $table->foreignId('class_id')->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('lesson_date');
            $table->string('lesson_title');
            $table->text('topic');
            $table->enum('status', ['planned', 'in_progress', 'completed', 'carried_forward'])->default('planned');
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['class_id', 'lesson_date'], 'lesson_plans_class_date_index');
            $table->index(['teacher_id', 'lesson_date'], 'lesson_plans_teacher_date_index');
            $table->index(['subject_id', 'lesson_date'], 'lesson_plans_subject_date_index');
            $table->index(['organization_id', 'lesson_date'], 'lesson_plans_org_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lesson_plans');
    }
};
