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
        Schema::table('voice_call_logs', function (Blueprint $table) {
            $table->string('audio_file_path')->nullable()->after('content');
            $table->string('audio_file_name')->nullable()->after('audio_file_path');
            $table->string('audio_mime_type')->nullable()->after('audio_file_name');
            $table->unsignedBigInteger('audio_file_size')->nullable()->default(0)->after('audio_mime_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('voice_call_logs', function (Blueprint $table) {
            $table->dropColumn(['audio_file_path', 'audio_file_name', 'audio_mime_type', 'audio_file_size']);
        });
    }
};
