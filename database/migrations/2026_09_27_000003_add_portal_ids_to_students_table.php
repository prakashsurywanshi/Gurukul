<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('register_no')->nullable()->after('roll_number');
            $table->string('udise_student_id')->nullable()->after('register_no');
            $table->string('saral_student_id')->nullable()->after('udise_student_id');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['register_no', 'udise_student_id', 'saral_student_id']);
        });
    }
};