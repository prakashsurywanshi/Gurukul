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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('class_id')->nullable()->constrained()->onDelete('set null');
            $table->string('admission_no')->unique();
            $table->string('roll_number')->nullable();
            
            // Personal Information
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth');
            $table->enum('gender', ['male', 'female', 'other']);
            $table->string('blood_group')->nullable();
            $table->string('nationality')->default('Indian');
            $table->string('religion')->nullable();
            $table->string('caste')->nullable();
            $table->string('category')->nullable(); // General, OBC, SC, ST
            $table->string('mother_tongue')->nullable();
            $table->string('aadhar_number')->nullable();
            $table->string('profile_photo')->nullable();
            
            // Contact Information
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('current_address')->nullable();
            $table->text('permanent_address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode')->nullable();
            
            // Parent/Guardian Information
            $table->string('father_name')->nullable();
            $table->string('father_phone')->nullable();
            $table->string('father_email')->nullable();
            $table->string('father_occupation')->nullable();
            $table->decimal('father_income', 10, 2)->nullable();
            
            $table->string('mother_name')->nullable();
            $table->string('mother_phone')->nullable();
            $table->string('mother_email')->nullable();
            $table->string('mother_occupation')->nullable();
            $table->decimal('mother_income', 10, 2)->nullable();
            
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->string('guardian_email')->nullable();
            $table->string('guardian_relation')->nullable();
            
            // Academic Information
            $table->date('admission_date');
            $table->string('previous_school')->nullable();
            $table->string('previous_class')->nullable();
            $table->decimal('previous_percentage', 5, 2)->nullable();
            $table->string('tc_number')->nullable(); // Transfer Certificate
            $table->date('tc_issue_date')->nullable();
            
            // Medical Information
            $table->text('medical_conditions')->nullable();
            $table->text('allergies')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->string('emergency_contact_relation')->nullable();
            
            // Transport & Hostel
            $table->boolean('transport_required')->default(false);
            $table->string('transport_route')->nullable();
            $table->boolean('hostel_required')->default(false);
            $table->string('hostel_room')->nullable();
            
            // Documents
            $table->string('birth_certificate')->nullable();
            $table->string('transfer_certificate')->nullable();
            $table->string('marksheet')->nullable();
            $table->string('aadhar_card')->nullable();
            $table->string('photo')->nullable();
            $table->json('other_documents')->nullable();
            
            // Status
            $table->enum('status', ['active', 'inactive', 'graduated', 'transferred', 'expelled'])->default('active');
            $table->text('notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
