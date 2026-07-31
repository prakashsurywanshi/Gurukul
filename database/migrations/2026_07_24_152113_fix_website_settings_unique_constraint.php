<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('website_settings')
            ->whereRaw('id NOT IN (
                SELECT min_id FROM (
                    SELECT MIN(id) AS min_id
                    FROM website_settings
                    GROUP BY organization_id, `key`, `group`
                ) AS keep
            )')
            ->delete();

        Schema::table('website_settings', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'key']);
            $table->unique(['organization_id', 'key', 'group']);
        });
    }

    public function down(): void
    {
        Schema::table('website_settings', function (Blueprint $table) {
            $table->dropUnique(['organization_id', 'key', 'group']);
            $table->unique(['organization_id', 'key']);
        });
    }
};
