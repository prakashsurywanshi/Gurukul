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
        Schema::create('download_center_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('content_type', 50);
            $table->string('category');
            $table->string('audience', 20);
            $table->string('share_group', 100);
            $table->string('format', 20)->nullable();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->text('description')->nullable();
            $table->string('duration', 50)->nullable();
            $table->unsignedInteger('downloads_count')->default(0);
            $table->date('shared_on');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'audience']);
            $table->index(['organization_id', 'share_group']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('download_center_items');
    }
};
