<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ptm_appointments')) {
            if (!Schema::hasColumn('ptm_appointments', 'remarks')) {
                Schema::table('ptm_appointments', function (Blueprint $table) {
                    $table->text('remarks')->nullable()->after('notes');
                });
            }

            if (!Schema::hasColumn('ptm_appointments', 'follow_up_required')) {
                Schema::table('ptm_appointments', function (Blueprint $table) {
                    $table->boolean('follow_up_required')->default(false)->after('remarks');
                });
            }

            if (!Schema::hasColumn('ptm_appointments', 'follow_up_due')) {
                Schema::table('ptm_appointments', function (Blueprint $table) {
                    $table->date('follow_up_due')->nullable()->after('follow_up_required');
                });
            }

            if (!Schema::hasColumn('ptm_appointments', 'follow_up_completed_at')) {
                Schema::table('ptm_appointments', function (Blueprint $table) {
                    $table->timestamp('follow_up_completed_at')->nullable()->after('follow_up_due');
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ptm_appointments')) {
            Schema::table('ptm_appointments', function (Blueprint $table) {
                foreach (['remarks', 'follow_up_required', 'follow_up_due', 'follow_up_completed_at'] as $column) {
                    if (Schema::hasColumn('ptm_appointments', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};