<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_exits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->string('type')->default('exit');
            $table->string('status')->default('pending');
            $table->string('reason')->nullable();
            $table->date('exit_date')->nullable();
            $table->string('tc_number')->nullable();
            $table->date('tc_issued_date')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('acted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'type']);
        });

        if (!Schema::hasColumn('students', 'enrollment_status')) {
            Schema::table('students', function (Blueprint $table) {
                $table->string('enrollment_status')->default('active')->index();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('student_exits');

        if (Schema::hasColumn('students', 'enrollment_status')) {
            Schema::table('students', function (Blueprint $table) {
                $table->dropIndex(['enrollment_status']);
                $table->dropColumn('enrollment_status');
            });
        }
    }
};