<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qwa_auto_alert_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('qwa_template_id');
            $table->string('trigger_event');
            $table->boolean('enabled')->default(false);
            $table->string('recipient_type')->default('parents');
            $table->json('recipient_roles')->nullable();
            $table->time('schedule_time')->nullable();
            $table->timestamp('last_fired_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'trigger_event', 'qwa_template_id'], 'qwa_alert_rule_unique_row');
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('qwa_template_id')->references('id')->on('qwa_whatsapp_templates')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qwa_auto_alert_rules');
    }
};