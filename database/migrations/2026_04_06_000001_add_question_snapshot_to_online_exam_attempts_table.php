<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('online_exam_attempts', function (Blueprint $table) {
            $table->json('question_snapshot')->nullable()->after('question_order');
        });
    }

    public function down(): void
    {
        Schema::table('online_exam_attempts', function (Blueprint $table) {
            $table->dropColumn('question_snapshot');
        });
    }
};
