<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('online_exams', function (Blueprint $table) {
            $table->json('target_class_sections')->nullable()->after('section');
        });
    }

    public function down(): void
    {
        Schema::table('online_exams', function (Blueprint $table) {
            $table->dropColumn('target_class_sections');
        });
    }
};
