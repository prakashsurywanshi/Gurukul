<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category')->default('Other');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('storage_path');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index(['organization_id', 'category', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};