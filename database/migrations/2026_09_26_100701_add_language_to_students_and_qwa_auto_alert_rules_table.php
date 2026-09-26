<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-student language preference for regional WhatsApp/SMS delivery and a
     * per-rule language override for automatic alerts. Both default to English
     * and accept the same codes as LanguageCatalog (en / mr / hi).
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('preferred_language', 10)->default('en')->after('status');
        });

        Schema::table('qwa_auto_alert_rules', function (Blueprint $table) {
            $table->string('language', 10)->default('en')->after('schedule_time');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('preferred_language');
        });

        Schema::table('qwa_auto_alert_rules', function (Blueprint $table) {
            $table->dropColumn('language');
        });
    }
};