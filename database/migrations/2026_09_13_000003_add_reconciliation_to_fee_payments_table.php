<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dateTime('reconciled_at')->nullable()->after('reverted_by');
            $table->unsignedBigInteger('reconciled_by')->nullable()->after('reconciled_at');
        });
    }

    public function down(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropColumn(['reconciled_at', 'reconciled_by']);
        });
    }
};