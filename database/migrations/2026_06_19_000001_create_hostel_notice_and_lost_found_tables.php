<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('hostel_notices')) {
            Schema::create('hostel_notices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('hostel_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('title');
                $table->text('message');
                $table->date('publish_date');
                $table->string('status')->default('active');
                $table->timestamps();

                $table->index(['organization_id', 'hostel_id', 'status']);
            });
        }

        if (! Schema::hasTable('hostel_lost_found_items')) {
            Schema::create('hostel_lost_found_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('hostel_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('reported_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('item_type');
                $table->string('item_name');
                $table->string('location')->nullable();
                $table->date('reported_date');
                $table->text('description')->nullable();
                $table->string('contact')->nullable();
                $table->string('status')->default('open');
                $table->text('resolution_note')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'hostel_id', 'item_type', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hostel_lost_found_items');
        Schema::dropIfExists('hostel_notices');
    }
};
