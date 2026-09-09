<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'middle_name')) {
                $table->string('middle_name', 100)->nullable();
            }

            if (! Schema::hasColumn('students', 'middle_name_mr')) {
                $table->string('middle_name_mr', 200)->nullable();
            }
        });
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};