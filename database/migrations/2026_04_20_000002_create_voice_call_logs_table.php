<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voice_call_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('audience_type', 50);
            $table->string('recipient_summary');
            $table->unsignedInteger('recipient_count')->default(0);
            $table->json('recipient_phones')->nullable();
            $table->string('subject');
            $table->text('content')->nullable();
            $table->string('status', 30)->default('scheduled');
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('provider_name', 50)->default('smartflo');
            $table->string('provider_reference')->nullable();
            $table->json('provider_response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voice_call_logs');
    }
};
