<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Locally cached mirror of the QWA session message templates so they can be
     * mapped to the app's template-variable vocabulary and used from the Send
     * QWA Whatsapp page without round-tripping the gateway each time.
     */
    public function up(): void
    {
        Schema::create('qwa_whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('session_id');
            $table->string('qwa_template_id');
            $table->string('name');
            $table->longText('body');
            $table->string('header')->nullable();
            $table->string('footer')->nullable();
            $table->json('media')->nullable();
            $table->json('placeholders')->nullable();
            $table->json('mapping')->nullable();
            $table->json('action_toggles')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'session_id', 'qwa_template_id'], 'qwa_template_unique_row');
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qwa_whatsapp_templates');
    }
};