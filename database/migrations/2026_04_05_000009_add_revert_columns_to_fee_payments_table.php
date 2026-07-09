<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->foreignId('reverted_by')->nullable()->after('collected_by')->constrained('users')->nullOnDelete();
            $table->date('reverted_at')->nullable()->after('status');
            $table->text('revert_reason')->nullable()->after('reverted_at');
        });
    }

    public function down(): void
    {
        Schema::table('fee_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reverted_by');
            $table->dropColumn(['reverted_at', 'revert_reason']);
        });
    }
};
