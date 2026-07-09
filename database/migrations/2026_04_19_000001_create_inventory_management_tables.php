<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('inventory_categories')) {
            Schema::create('inventory_categories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->timestamps();

                $table->unique(['organization_id', 'name']);
            });
        }

        if (!Schema::hasTable('inventory_stores')) {
            Schema::create('inventory_stores', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->string('manager');
                $table->string('location')->nullable();
                $table->timestamps();

                $table->unique(['organization_id', 'name']);
            });
        }

        if (!Schema::hasTable('inventory_suppliers')) {
            Schema::create('inventory_suppliers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->string('contact_person');
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->text('address')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->foreignId('inventory_category_id')->constrained('inventory_categories')->onDelete('cascade');
                $table->foreignId('inventory_store_id')->constrained('inventory_stores')->onDelete('cascade');
                $table->foreignId('inventory_supplier_id')->constrained('inventory_suppliers')->onDelete('cascade');
                $table->string('name');
                $table->string('unit')->default('pcs');
                $table->unsignedInteger('available_stock')->default(0);
                $table->unsignedInteger('minimum_stock')->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('inventory_stock_entries')) {
            Schema::create('inventory_stock_entries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
                $table->foreignId('inventory_supplier_id')->constrained('inventory_suppliers')->onDelete('cascade');
                $table->foreignId('inventory_store_id')->constrained('inventory_stores')->onDelete('cascade');
                $table->unsignedInteger('quantity');
                $table->decimal('unit_price', 10, 2)->default(0);
                $table->date('stock_date');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('inventory_issues')) {
            Schema::create('inventory_issues', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
                $table->string('issued_to');
                $table->unsignedInteger('quantity');
                $table->date('issue_date');
                $table->date('return_date')->nullable();
                $table->enum('status', ['Issued', 'Returned'])->default('Issued');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_issues');
        Schema::dropIfExists('inventory_stock_entries');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('inventory_suppliers');
        Schema::dropIfExists('inventory_stores');
        Schema::dropIfExists('inventory_categories');
    }
};
