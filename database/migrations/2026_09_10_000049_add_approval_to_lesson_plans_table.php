<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add an approval workflow to lesson plans (approved_by / approved_at).
     */
    public function up(): void
    {
        Schema::table('lesson_plans', function (Blueprint $table) {
            if (! Schema::hasColumn('lesson_plans', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('updated_by')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('lesson_plans', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lesson_plans', function (Blueprint $table) {
            if (Schema::hasColumn('lesson_plans', 'approved_at')) {
                $table->dropColumn('approved_at');
            }

            if (Schema::hasColumn('lesson_plans', 'approved_by')) {
                $table->dropConstrainedForeignId('approved_by');
            }
        });
    }
};