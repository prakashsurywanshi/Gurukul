<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('staff_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('wallet_type')->default('sms');
            $table->decimal('credits', 12, 2)->default(0);
            $table->string('transaction_type')->default('credit');
            $table->string('description')->nullable();
            $table->decimal('balance_after', 12, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'wallet_type']);
            $table->index(['staff_user_id', 'wallet_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_credits');
    }
};