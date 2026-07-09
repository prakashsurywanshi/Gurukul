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
        Schema::create('library_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('book_number')->unique();
            $table->string('isbn')->nullable();
            $table->string('title');
            $table->string('author');
            $table->string('publisher')->nullable();
            $table->string('edition')->nullable();
            $table->integer('publication_year')->nullable();
            $table->string('category'); // Fiction, Non-Fiction, Science, Mathematics, etc.
            $table->string('language')->default('English');
            $table->integer('total_copies')->default(1);
            $table->integer('available_copies')->default(1);
            $table->decimal('price', 10, 2)->nullable();
            $table->string('rack_number')->nullable();
            $table->string('cover_image')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'damaged', 'lost', 'archived'])->default('active');
            $table->timestamps();
            
            $table->index(['category', 'status']);
            $table->index('book_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('library_books');
    }
};
