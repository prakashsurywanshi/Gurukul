<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hpc_frameworks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('criteria')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['organization_id', 'is_default']);
        });

        Schema::create('hpc_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('framework_id')->nullable()->constrained('hpc_frameworks')->nullOnDelete();
            $table->string('name');
            $table->string('card_type')->default('academic');
            $table->text('description')->nullable();
            $table->json('sections')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'card_type']);
        });

        Schema::create('hpc_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years')->nullOnDelete();
            $table->string('category');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('rating', 3, 1)->nullable();
            $table->string('teacher_remark')->nullable();
            $table->date('occurred_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'student_id', 'category']);
        });

        Schema::create('hpc_student_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('card_id')->constrained('hpc_cards')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years')->nullOnDelete();
            $table->json('data')->nullable();
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'student_id', 'card_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hpc_student_cards');
        Schema::dropIfExists('hpc_activities');
        Schema::dropIfExists('hpc_cards');
        Schema::dropIfExists('hpc_frameworks');
    }
};