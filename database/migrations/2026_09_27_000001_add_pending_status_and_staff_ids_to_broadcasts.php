<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_recipients', function (Blueprint $table) {
            $table->enum('status', ['pending', 'sent', 'delivered', 'opened', 'failed'])->default('pending')->change();
        });

        Schema::table('broadcasts', function (Blueprint $table) {
            $table->json('staff_ids')->nullable()->after('student_ids');
        });
    }

    public function down(): void
    {
        Schema::table('broadcast_recipients', function (Blueprint $table) {
            $table->enum('status', ['sent', 'delivered', 'opened', 'failed'])->default('sent')->change();
        });

        Schema::table('broadcasts', function (Blueprint $table) {
            $table->dropColumn('staff_ids');
        });
    }
};