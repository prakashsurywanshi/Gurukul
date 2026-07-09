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
        Schema::create('complaint_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('complainant_name');
            $table->string('phone', 20)->nullable();
            $table->string('source', 50)->default('walk_in');
            $table->string('category', 100);
            $table->string('assigned_to')->nullable();
            $table->date('complaint_date');
            $table->string('status', 50)->default('open');
            $table->text('note')->nullable();
            $table->text('action_taken')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaint_entries');
    }
};
