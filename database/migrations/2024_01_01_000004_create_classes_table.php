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
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('academic_year_id')->constrained()->onDelete('cascade');
            $table->string('name'); // e.g., "1", "2", "10"
            $table->string('section'); // e.g., "A", "B", "C"
            $table->foreignId('class_teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->integer('capacity')->default(40);
            $table->string('room_number')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            
            // Unique constraint for class-section combination per organization and academic year
            $table->unique(['organization_id', 'academic_year_id', 'name', 'section'], 'unique_class_section');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
