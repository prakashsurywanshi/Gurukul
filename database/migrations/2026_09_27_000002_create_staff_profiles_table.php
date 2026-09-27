<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('aadhar_number')->nullable();
            $table->string('pan')->nullable();
            $table->string('national_teacher_id')->nullable();
            $table->string('employee_code')->nullable();
            $table->date('appointment_date')->nullable();
            $table->string('appointment_type')->nullable();
            $table->string('recruitment_type')->nullable();
            $table->string('post')->nullable();
            $table->string('pay_scale')->nullable();
            $table->decimal('basic_pay', 12, 2)->nullable();
            $table->date('government_service_join_date')->nullable();
            $table->string('qualification')->nullable();
            $table->string('teaching_qualification')->nullable();
            $table->string('tet_status')->nullable();
            $table->string('mother_tongue')->nullable();
            $table->string('religion')->nullable();
            $table->string('category')->nullable();
            $table->json('subjects_taught')->nullable();
            $table->unsignedInteger('experience_years')->nullable();
            $table->boolean('training_received')->default(false);
            $table->string('teacher_type')->nullable();
            $table->unique(['organization_id', 'user_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_profiles');
    }
};