<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            if (! Schema::hasColumn('exams', 'class_id')) {
                return;
            }

            $table->dropForeign(['class_id']);
            $table->dropColumn(['class_id', 'section']);
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->foreignId('class_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('section')->nullable();
        });
    }
};