<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->date('start_date')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['course_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};