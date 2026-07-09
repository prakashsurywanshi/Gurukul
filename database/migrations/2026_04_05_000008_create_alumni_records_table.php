<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumni_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
            $table->string('session');
            $table->string('admission_no');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('class')->nullable();
            $table->string('section')->nullable();
            $table->string('passing_year')->nullable();
            $table->string('alumni_status')->default('left_school');
            $table->string('current_city')->nullable();
            $table->string('organization_name')->default('Left School');
            $table->timestamps();

            $table->unique(['organization_id', 'student_id', 'session']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumni_records');
    }
};
