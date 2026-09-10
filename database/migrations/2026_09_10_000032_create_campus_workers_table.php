<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campus_workers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('worker_type')->default('general');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone')->nullable();
            $table->date('joining_date')->nullable();
            $table->string('shift')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['organization_id', 'name']);
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'worker_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campus_workers');
    }
};