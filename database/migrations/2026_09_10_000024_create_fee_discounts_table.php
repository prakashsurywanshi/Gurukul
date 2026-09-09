<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('name_hi')->nullable();
            $table->string('name_mr')->nullable();
            $table->enum('discount_type', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('value', 10, 2);
            $table->text('description')->nullable();
            $table->text('description_hi')->nullable();
            $table->text('description_mr')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['organization_id', 'name']);
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_discounts');
    }
};