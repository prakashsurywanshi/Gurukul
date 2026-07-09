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
        Schema::create('visitor_register_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('visitor_name');
            $table->string('purpose', 255);
            $table->string('person_to_meet')->nullable();
            $table->string('contact', 20)->nullable();
            $table->string('id_proof')->nullable();
            $table->date('entry_date');
            $table->string('entry_time', 20)->nullable();
            $table->string('exit_time', 20)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_register_entries');
    }
};
