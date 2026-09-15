<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->foreignId('semester_id')->nullable()->after('academic_year_id')->constrained()->nullOnDelete();
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->foreignId('semester_id')->nullable()->after('class_id')->constrained()->nullOnDelete();
        });

        Schema::table('student_fees', function (Blueprint $table) {
            $table->foreignId('semester_id')->nullable()->after('academic_year_id')->constrained()->nullOnDelete();
        });

        Schema::table('student_academic_histories', function (Blueprint $table) {
            $table->foreignId('course_id')->nullable()->after('class_id')->constrained()->nullOnDelete();
            $table->foreignId('batch_id')->nullable()->after('course_id')->constrained()->nullOnDelete();
            $table->foreignId('semester_id')->nullable()->after('batch_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('student_academic_histories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('semester_id');
            $table->dropConstrainedForeignId('batch_id');
            $table->dropConstrainedForeignId('course_id');
        });

        Schema::table('student_fees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('semester_id');
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->dropConstrainedForeignId('semester_id');
        });

        Schema::table('exams', function (Blueprint $table) {
            $table->dropConstrainedForeignId('semester_id');
        });
    }
};