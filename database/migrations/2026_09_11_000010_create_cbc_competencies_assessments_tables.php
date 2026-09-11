<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cbc_competencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cbc_strand_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'name']);
        });

        Schema::create('cbc_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cbc_strand_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cbc_learning_outcome_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cbc_competency_id')->nullable()->constrained()->nullOnDelete();
            $table->string('level')->default('emerging');
            $table->text('notes')->nullable();
            $table->foreignId('assessed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('assessed_on')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'student_id']);
            $table->index(['organization_id', 'assessed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbc_assessments');
        Schema::dropIfExists('cbc_competencies');
    }
};