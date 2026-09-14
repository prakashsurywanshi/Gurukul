<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('event_type', 80);
            $table->string('label', 120);
            $table->boolean('is_active')->default(true);
            $table->json('channels')->default('["bell"]');
            $table->json('recipient_roles')->nullable();
            $table->json('conditions')->nullable();
            $table->text('digest_summary')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'event_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_rules');
    }
};