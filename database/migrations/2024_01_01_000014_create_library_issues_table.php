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
        Schema::create('library_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('book_id')->constrained('library_books')->onDelete('cascade');
            $table->foreignId('student_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade'); // For staff members
            $table->date('issue_date');
            $table->date('due_date');
            $table->date('return_date')->nullable();
            $table->decimal('fine_amount', 10, 2)->default(0);
            $table->boolean('fine_paid')->default(false);
            $table->enum('status', ['issued', 'returned', 'overdue', 'lost'])->default('issued');
            $table->text('remarks')->nullable();
            $table->foreignId('issued_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('returned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index(['student_id', 'status']);
            $table->index(['due_date', 'status']);
            $table->index(['book_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('library_issues');
    }
};
