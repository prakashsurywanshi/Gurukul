<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issued_certificates', function (Blueprint $table) {
            $columns = ['student_name_mr', 'class_mr', 'section_mr', 'reason_mr'];

            foreach ($columns as $column) {
                if (! Schema::hasColumn('issued_certificates', $column)) {
                    $table->string($column)->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};