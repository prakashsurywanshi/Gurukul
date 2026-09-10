<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appraisal_cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status')->default('active');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'name']);
        });

        Schema::create('staff_appraisals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('appraisal_cycle_id')->constrained()->cascadeOnDelete();
            $table->json('criteria')->nullable();
            $table->integer('overall_score')->nullable();
            $table->string('rating')->nullable();
            $table->foreignId('reviewer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('feedback')->nullable();
            $table->string('status')->default('draft');
            $table->date('review_date')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'appraisal_cycle_id']);
            $table->index('staff_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_appraisals');
        Schema::dropIfExists('appraisal_cycles');
    }
};