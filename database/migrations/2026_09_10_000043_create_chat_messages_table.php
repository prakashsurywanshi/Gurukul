<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('conversation_key')->nullable();
            $table->text('body');
            $table->string('message_type')->default('chat');
            $table->boolean('is_flagged')->default(false);
            $table->string('moderation_status')->default('visible');
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('moderation_action')->nullable();
            $table->text('moderation_reason')->nullable();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};