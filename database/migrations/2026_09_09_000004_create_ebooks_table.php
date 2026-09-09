<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ebooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('author')->nullable();
            $table->string('isbn', 64)->nullable();
            $table->enum('type', ['ebook', 'video', 'journal', 'audio'])->default('ebook');
            $table->unsignedBigInteger('category_id')->nullable();
            $table->text('description')->nullable();
            $table->json('file')->nullable();
            $table->string('url')->nullable();
            $table->string('thumbnail')->nullable();
            $table->foreignId('subject_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['type', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ebooks');
    }
};