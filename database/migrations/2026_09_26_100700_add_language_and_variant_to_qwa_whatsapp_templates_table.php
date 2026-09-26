<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * QWA templates become grouped regional variants. Synced gateway
     * templates keep `language = en` and are assigned a `variant_key` that
     * matches one of the canonical intents. Locally authored Marathi / Hindi
     * custom templates share the same `variant_key` so a send can pick the
     * right language variant.
     */
    public function up(): void
    {
        Schema::table('qwa_whatsapp_templates', function (Blueprint $table) {
            $table->string('language', 10)->default('en')->after('is_custom');
            $table->string('variant_key', 120)->nullable()->after('language');
        });

        $variantKeys = [
            'fee_receipt_confirmation' => 'fee_receipt',
            'parent_meeting_invitation' => 'parent_meeting',
            'birthday_wishes' => 'birthday',
            'holiday_announcement' => 'holiday',
            'bus_arrival_notification' => 'bus_arrival',
            'exam_result_notification' => 'exam_result',
            'homework_notification' => 'homework',
            'attendance_alert' => 'attendance_alert',
            'fee_payment_reminder' => 'fee_reminder',
            'admission_confirmation' => 'admission',
        ];

        foreach ($variantKeys as $name => $key) {
            DB::table('qwa_whatsapp_templates')
                ->where('name', $name)
                ->whereNull('variant_key')
                ->update(['variant_key' => $key]);
        }
    }

    public function down(): void
    {
        Schema::table('qwa_whatsapp_templates', function (Blueprint $table) {
            $table->dropColumn(['language', 'variant_key']);
        });
    }
};