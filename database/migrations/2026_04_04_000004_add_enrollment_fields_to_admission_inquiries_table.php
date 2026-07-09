<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admission_inquiries', function (Blueprint $table) {
            $table->string('status', 30)->default('pending')->after('email_verified_at');
            $table->foreignId('enrolled_student_id')->nullable()->after('status')->constrained('students')->nullOnDelete();
            $table->timestamp('enrolled_at')->nullable()->after('enrolled_student_id');
        });
    }

    public function down(): void
    {
        Schema::table('admission_inquiries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('enrolled_student_id');
            $table->dropColumn(['status', 'enrolled_at']);
        });
    }
};
