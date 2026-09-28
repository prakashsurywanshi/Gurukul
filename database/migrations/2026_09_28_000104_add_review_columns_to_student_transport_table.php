<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_transport', function (Blueprint $table) {
            if (! Schema::hasColumn('student_transport', 'created_by_user_id')) {
                $table->foreignId('created_by_user_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('student_transport', 'reviewed_by_user_id')) {
                $table->foreignId('reviewed_by_user_id')->nullable()->after('created_by_user_id')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('student_transport', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('reviewed_by_user_id');
            }

            if (! Schema::hasColumn('student_transport', 'decision_note')) {
                $table->text('decision_note')->nullable()->after('reviewed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('student_transport', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['created_by_user_id', 'reviewed_by_user_id', 'reviewed_at', 'decision_note'],
                fn ($column) => Schema::hasColumn('student_transport', $column)
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
