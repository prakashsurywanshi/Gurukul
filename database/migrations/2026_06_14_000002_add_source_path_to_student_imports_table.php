<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student_imports') || Schema::hasColumn('student_imports', 'source_path')) {
            return;
        }

        Schema::table('student_imports', function (Blueprint $table) {
            $table->string('source_path')->nullable()->after('queue');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('student_imports') || ! Schema::hasColumn('student_imports', 'source_path')) {
            return;
        }

        Schema::table('student_imports', function (Blueprint $table) {
            $table->dropColumn('source_path');
        });
    }
};
