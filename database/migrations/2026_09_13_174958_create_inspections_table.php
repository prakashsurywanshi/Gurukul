<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('inspector_name')->nullable();
            $table->string('inspection_type')->default('compliance');
            $table->date('scheduled_date')->nullable();
            $table->enum('status', ['planned', 'in_progress', 'completed', 'cancelled'])->default('planned');
            $table->unsignedTinyInteger('score')->nullable();
            $table->text('findings')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};