<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_card_remarks', function (Blueprint $table) {
            $table->foreignId('subject_id')->nullable()->after('student_id')->constrained('subjects')->nullOnDelete();
            $table->text('subject_remark')->nullable()->after('principal_remark');
            $table->index(['organization_id'], 'report_card_remarks_organization_id_tmp');
            $table->dropUnique('report_card_remarks_unique');
            $table->unique(['organization_id', 'exam_id', 'student_id', 'subject_id'], 'report_card_remarks_unique');
            $table->dropIndex('report_card_remarks_organization_id_tmp');
        });
    }

    public function down(): void
    {
        Schema::table('report_card_remarks', function (Blueprint $table) {
            $table->index(['organization_id'], 'report_card_remarks_organization_id_tmp');
            $table->dropUnique('report_card_remarks_unique');
            $table->unique(['organization_id', 'exam_id', 'student_id'], 'report_card_remarks_unique');
            $table->dropIndex('report_card_remarks_organization_id_tmp');
            $table->dropConstrainedForeignId('subject_id');
            $table->dropColumn('subject_remark');
        });
    }
};