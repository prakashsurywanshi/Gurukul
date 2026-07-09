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
        Schema::table('timetables', function (Blueprint $table) {
            $table->string('period_code', 20)->nullable()->after('day');
            $table->unsignedSmallInteger('period_order')->nullable()->after('period_code');

            $table->index(['class_id', 'day', 'period_order'], 'timetables_class_day_period_index');
            $table->index(['teacher_id', 'day', 'period_order'], 'timetables_teacher_day_period_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('timetables', function (Blueprint $table) {
            $table->dropIndex('timetables_class_day_period_index');
            $table->dropIndex('timetables_teacher_day_period_index');
            $table->dropColumn(['period_code', 'period_order']);
        });
    }
};
