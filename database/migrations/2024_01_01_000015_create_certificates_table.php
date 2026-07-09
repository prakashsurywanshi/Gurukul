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
        Schema::create('certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->enum('type', ['merit', 'achievement', 'participation', 'appreciation', 'completion'])->default('merit');
            $table->text('description')->nullable();
            $table->string('template_design')->default('template1'); // template1, template2, template3
            $table->json('design_settings')->nullable(); // Colors, fonts, etc.
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('issued_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('certificate_template_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->string('certificate_number')->unique();
            $table->string('student_name');
            $table->string('class');
            $table->string('section');
            $table->text('reason');
            $table->date('issue_date');
            $table->string('issued_by');
            $table->string('issued_by_designation')->default('Principal');
            $table->string('file_path')->nullable(); // PDF storage path
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['student_id', 'issue_date']);
            $table->index('certificate_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issued_certificates');
        Schema::dropIfExists('certificate_templates');
    }
};
