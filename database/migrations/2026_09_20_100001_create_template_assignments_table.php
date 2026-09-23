<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-organization default template assignment for every printable output
     * (student/staff ID cards, report card, HPC, certificate grid, marksheet,
     * hall ticket, fee challan, due slip, payslip, TC, school report).
     */
    public function up(): void
    {
        Schema::create('template_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('slot')->index();
            $table->foreignId('template_id')->nullable()->constrained('certificate_templates')->nullOnDelete();
            $table->boolean('is_default')->default(false);
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_assignments');
    }
};