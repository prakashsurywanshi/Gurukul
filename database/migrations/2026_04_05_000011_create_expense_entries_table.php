<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('category');
            $table->decimal('amount', 10, 2);
            $table->date('date');
            $table->string('payment_mode')->default('Cash');
            $table->string('paid_to');
            $table->string('voucher_no')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['paid', 'due'])->default('paid');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_entries');
    }
};
