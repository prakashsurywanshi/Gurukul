<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classwork_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->enum('entry_type', ['classwork', 'logbook'])->default('classwork');
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('entry_date');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['organization_id', 'class_id', 'entry_date']);
            $table->index(['organization_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classwork_entries');
    }
};