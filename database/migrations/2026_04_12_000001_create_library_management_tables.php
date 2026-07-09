<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('library_books')) {
            Schema::create('library_books', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->string('title');
                $table->string('author');
                $table->string('category');
                $table->string('isbn')->nullable();
                $table->string('rack');
                $table->string('language')->default('English');
                $table->string('publisher')->nullable();
                $table->unsignedInteger('total_copies')->default(1);
                $table->unsignedInteger('available_copies')->default(1);
                $table->unsignedInteger('issued_count')->default(0);
                $table->decimal('price', 10, 2)->default(0);
                $table->enum('status', ['Available', 'Low Stock', 'Issued Out'])->default('Available');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('library_members')) {
            Schema::create('library_members', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->enum('member_type', ['Student', 'Teacher']);
                $table->foreignId('student_id')->nullable()->constrained('students')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
                $table->string('library_card_number')->nullable();
                $table->decimal('fine_due', 10, 2)->default(0);
                $table->timestamps();

                $table->unique(['organization_id', 'student_id']);
                $table->unique(['organization_id', 'user_id']);
                $table->unique(['organization_id', 'library_card_number']);
            });
        }

        if (!Schema::hasTable('library_circulations')) {
            Schema::create('library_circulations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->foreignId('library_book_id')->constrained('library_books')->onDelete('cascade');
                $table->foreignId('library_member_id')->constrained('library_members')->onDelete('cascade');
                $table->date('issue_date');
                $table->date('due_date');
                $table->date('return_date')->nullable();
                $table->enum('status', ['Issued', 'Overdue', 'Returned'])->default('Issued');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('library_acquisition_requests')) {
            Schema::create('library_acquisition_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->string('title');
                $table->string('requested_by');
                $table->string('category');
                $table->enum('priority', ['High', 'Medium', 'Low'])->default('Medium');
                $table->unsignedInteger('copies')->default(1);
                $table->decimal('budget', 10, 2)->default(0);
                $table->enum('status', ['Pending', 'Approved', 'Ordered'])->default('Pending');
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('library_acquisition_requests');
        Schema::dropIfExists('library_circulations');
        Schema::dropIfExists('library_members');
        Schema::dropIfExists('library_books');
    }
};
