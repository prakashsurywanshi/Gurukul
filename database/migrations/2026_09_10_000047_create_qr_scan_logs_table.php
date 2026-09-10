<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('scanned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('method')->default('qr');
            $table->string('status')->default('success');
            $table->string('qr_token')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->date('scan_date');
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'scan_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_scan_logs');
    }
};