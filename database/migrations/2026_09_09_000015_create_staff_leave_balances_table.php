<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('leave_type');
            $table->unsignedInteger('year');
            $table->decimal('entitled_days', 5, 1)->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'user_id', 'leave_type', 'year'], 'staff_leave_balance_unique');
            $table->index(['organization_id', 'user_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_leave_balances');
    }
};