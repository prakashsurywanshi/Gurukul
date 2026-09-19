<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('category'); // lead | fee_defaulter | student_risk | route
            $table->string('entity_type'); // App\Models\Lead | App\Models\Student | App\Models\StudentFee | TransportRoute
            $table->unsignedBigInteger('entity_id');
            $table->unsignedTinyInteger('score')->default(0);
            $table->string('tier')->default('low'); // low | medium | high
            $table->json('score_breakdown')->nullable();
            $table->json('context')->nullable();
            $table->text('narrative')->nullable();
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'category', 'tier']);
            $table->index(['organization_id', 'category', 'entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_scores');
    }
};