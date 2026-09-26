<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qwa_auto_alert_log', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('rule_id');
            $table->string('recipient_phone', 50);
            $table->string('event_key');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['rule_id', 'event_key'], 'qwa_alert_log_unique_row');
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('rule_id')->references('id')->on('qwa_auto_alert_rules')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qwa_auto_alert_log');
    }
};