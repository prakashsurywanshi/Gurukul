<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('loan_reason');
            $table->decimal('principal_amount', 12, 2)->default(0);
            $table->decimal('interest_rate', 5, 2)->default(0);
            $table->integer('tenure_months')->default(1);
            $table->decimal('monthly_emi', 12, 2)->default(0);
            $table->date('start_date');
            $table->integer('paid_emis')->default(0);
            $table->string('status')->default('active');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index('staff_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_loans');
    }
};