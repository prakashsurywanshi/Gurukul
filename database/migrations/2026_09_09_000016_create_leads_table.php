<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('student_name');
            $table->string('parent_name')->nullable();
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('source')->default('walkin');
            $table->string('interested_class')->nullable();
            $table->string('academic_year')->nullable();
            $table->string('status')->default('new');
            $table->string('priority')->default('medium');
            $table->string('preferred_contact_time')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'follow_up_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};