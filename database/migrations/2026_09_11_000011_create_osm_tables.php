<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('osm_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('term')->default('Term1');
            $table->string('status')->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('osm_sheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('osm_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject')->nullable();
            $table->unsignedInteger('sheets_count')->default(0);
            $table->unsignedInteger('evaluated_count')->default(0);
            $table->timestamps();

            $table->index(['osm_session_id', 'class_id']);
        });

        Schema::create('osm_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('osm_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('osm_sheet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->decimal('score', 5, 2)->nullable();
            $table->string('grade_level')->nullable();
            $table->text('feedback')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('evaluated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('evaluated_at')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->index(['osm_session_id', 'status']);
            $table->index(['osm_sheet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('osm_evaluations');
        Schema::dropIfExists('osm_sheets');
        Schema::dropIfExists('osm_sessions');
    }
};