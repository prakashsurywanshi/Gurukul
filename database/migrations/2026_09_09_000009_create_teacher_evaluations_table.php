<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->string('period');
            $table->json('scores');
            $table->unsignedSmallInteger('total_score')->default(0);
            $table->unsignedSmallInteger('max_score')->default(0);
            $table->text('strengths')->nullable();
            $table->text('improvements')->nullable();
            $table->enum('status', ['draft', 'submitted'])->default('draft');
            $table->foreignId('evaluated_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['teacher_id', 'status']);
            $table->index('period');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_evaluations');
    }
};