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
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('asset_code')->nullable();
            $table->string('category');
            $table->string('subcategory')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_cost', 12, 2)->default(0);
            $table->decimal('current_value', 12, 2)->default(0);
            $table->decimal('depreciation_rate', 5, 2)->nullable();
            $table->string('status')->default('in_use');
            $table->string('condition')->default('good');
            $table->string('location')->nullable();
            $table->string('assigned_to')->nullable();
            $table->string('vendor')->nullable();
            $table->string('serial_number')->nullable();
            $table->text('notes')->nullable();
            $table->date('disposal_date')->nullable();
            $table->decimal('disposal_sale_price', 12, 2)->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'category']);
            $table->unique(['organization_id', 'asset_code']);
        });

        Schema::create('asset_maintenance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->date('maintenance_date');
            $table->string('maintenance_type')->default('repair');
            $table->decimal('cost', 12, 2)->default(0);
            $table->string('performed_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['asset_id', 'maintenance_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_maintenance_logs');
        Schema::dropIfExists('assets');
    }
};