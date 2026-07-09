<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->foreignId('transport_assignment_id')
                ->nullable()
                ->after('hostel_allocation_id')
                ->constrained('student_transport')
                ->nullOnDelete();
            $table->index(['transport_assignment_id']);
        });
    }

    public function down(): void
    {
        Schema::table('student_fees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transport_assignment_id');
        });
    }
};
