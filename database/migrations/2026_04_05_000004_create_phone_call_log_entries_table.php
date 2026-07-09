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
        Schema::create('phone_call_log_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('caller_name');
            $table->string('phone', 20)->nullable();
            $table->string('call_type', 20);
            $table->string('purpose', 255);
            $table->date('call_date');
            $table->string('call_time', 20)->nullable();
            $table->string('duration', 50)->nullable();
            $table->date('follow_up_date')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('phone_call_log_entries');
    }
};
