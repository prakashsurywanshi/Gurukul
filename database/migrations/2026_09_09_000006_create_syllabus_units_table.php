<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('syllabus_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id');
            $table->foreignId('subject_id');
            $table->string('title');
            $table->string('book')->nullable();
            $table->tinyInteger('term')->default(1);
            $table->text('topics')->nullable();
            $table->unsignedSmallInteger('coverage_percent')->default(0);
            $table->timestamp('covered_at')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('syllabus_units');
    }
};