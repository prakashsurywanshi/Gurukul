<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'qr_token')) {
                $table->string('qr_token', 64)->nullable()->unique();
            }
        });
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};