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
        Schema::create('postal_delivery_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference_no')->nullable();
            $table->string('from_title');
            $table->text('address')->nullable();
            $table->string('delivery_type', 100);
            $table->string('received_by')->nullable();
            $table->date('delivery_date');
            $table->string('tracking_no')->nullable();
            $table->string('status', 50)->default('received');
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('postal_delivery_entries');
    }
};
