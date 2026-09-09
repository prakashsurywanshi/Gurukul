<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'sso_provider')) {
                $table->string('sso_provider')->nullable();
            }

            if (! Schema::hasColumn('users', 'sso_avatar')) {
                $table->string('sso_avatar')->nullable();
            }
        });
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};