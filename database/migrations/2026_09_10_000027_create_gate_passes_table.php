<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_passes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->enum('person_type', ['student', 'staff']);
            $table->unsignedBigInteger('student_id')->nullable();
            $table->unsignedBigInteger('staff_user_id')->nullable();
            $table->string('person_name');
            $table->string('person_contact')->nullable();
            $table->enum('pass_type', ['entry', 'exit']);
            $table->string('reason', 500);
            $table->timestamp('expected_return_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->enum('status', ['open', 'closed', 'cancelled'])->default('open');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->foreign('staff_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_passes');
    }
};