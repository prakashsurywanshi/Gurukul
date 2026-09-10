<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('entity', 20);
            $table->string('label', 191);
            $table->string('field_key', 191);
            $table->string('field_type', 20);
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('show_in_admission')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'entity', 'field_key'], 'custom_field_definitions_key_unique');
        });

        Schema::create('custom_field_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('entity', 20);
            $table->unsignedBigInteger('entity_id');
            $table->foreignId('field_id')->constrained('custom_field_definitions')->onDelete('cascade');
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'entity', 'entity_id', 'field_id'], 'custom_field_values_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
        Schema::dropIfExists('custom_field_definitions');
    }
};