<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('department');
            $table->enum('position_type', ['full-time', 'part-time', 'contract', 'internship'])->default('full-time');
            $table->unsignedSmallInteger('vacancies')->default(1);
            $table->text('description')->nullable();
            $table->longText('requirements')->nullable();
            $table->string('salary_range')->nullable();
            $table->string('qualifications')->nullable();
            $table->enum('status', ['open', 'closed', 'draft'])->default('open');
            $table->date('application_deadline')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_postings');
    }
};