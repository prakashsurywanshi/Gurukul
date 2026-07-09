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
        Schema::create('exam_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('exam_schedule_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->decimal('theory_marks', 5, 2)->nullable();
            $table->decimal('practical_marks', 5, 2)->nullable();
            $table->decimal('total_marks', 5, 2);
            $table->decimal('obtained_marks', 5, 2);
            $table->string('grade')->nullable(); // A+, A, B+, B, C, D, F
            $table->boolean('is_absent')->default(false);
            $table->text('remarks')->nullable();
            $table->foreignId('entered_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['exam_schedule_id', 'student_id']);
            $table->index(['student_id', 'exam_schedule_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_results');
    }
};
