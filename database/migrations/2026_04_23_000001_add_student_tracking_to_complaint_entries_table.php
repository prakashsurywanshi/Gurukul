<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaint_entries', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable()->after('organization_id')->constrained()->nullOnDelete();
            $table->foreignId('submitted_by_user_id')->nullable()->after('student_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('complaint_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('submitted_by_user_id');
            $table->dropConstrainedForeignId('student_id');
        });
    }
};
