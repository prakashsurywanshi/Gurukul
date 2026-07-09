<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('super_admin_settings', function (Blueprint $table) {
            $table->json('knowledge_base_content')->nullable()->after('reply_to_email');
        });
    }

    public function down(): void
    {
        Schema::table('super_admin_settings', function (Blueprint $table) {
            $table->dropColumn('knowledge_base_content');
        });
    }
};
