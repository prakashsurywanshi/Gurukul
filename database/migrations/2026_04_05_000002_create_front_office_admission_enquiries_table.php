<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('front_office_admission_enquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('full_name');
            $table->string('guardian_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 20);
            $table->string('class_interested', 120);
            $table->date('enquiry_date');
            $table->string('source', 50)->default('walk_in');
            $table->string('status', 50)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('front_office_admission_enquiries');
    }
};
