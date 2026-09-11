<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('report_card_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('layout')->default('standard');
            $table->boolean('show_rank')->default(false);
            $table->boolean('show_percentage')->default(true);
            $table->boolean('show_remarks')->default(true);
            $table->boolean('show_subject_wise_grade')->default(true);
            $table->string('header_color')->default('#4f46e5');
            $table->string('remarks')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['organization_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_card_templates');
    }
};