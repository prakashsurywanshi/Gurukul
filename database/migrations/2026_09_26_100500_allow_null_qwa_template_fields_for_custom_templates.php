<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qwa_whatsapp_templates', function (Blueprint $table) {
            $table->string('qwa_template_id')->nullable()->change();
            $table->string('session_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('qwa_whatsapp_templates', function (Blueprint $table) {
            $table->string('qwa_template_id')->nullable(false)->change();
            $table->string('session_id')->nullable(false)->change();
        });
    }
};