<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('name_hi')->nullable();
            $table->string('name_mr')->nullable();
            $table->text('description')->nullable();
            $table->text('description_hi')->nullable();
            $table->text('description_mr')->nullable();
            $table->string('status')->default('active');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'name']);
            $table->index(['organization_id', 'status', 'sort_order']);
        });

        Schema::create('fee_group_fee_type', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fee_group_id')->constrained()->onDelete('cascade');
            $table->foreignId('fee_type_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['fee_group_id', 'fee_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_group_fee_type');
        Schema::dropIfExists('fee_groups');
    }
};