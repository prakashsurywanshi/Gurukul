<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->foreignId('hostel_allocation_id')->nullable()->after('fee_structure_id')->constrained('hostel_allocations')->nullOnDelete();
            $table->index(['hostel_allocation_id']);
        });
    }

    public function down(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hostel_allocation_id');
        });
    }
};
