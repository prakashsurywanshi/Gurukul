<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['behavior', 'academic', 'attendance', 'uniform', 'safety', 'other'])->default('behavior');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('incident_date')->default(now()->toDateString());
            $table->enum('status', ['open', 'reviewed', 'resolved'])->default('open');
            $table->text('action_taken')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['student_id', 'incident_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};