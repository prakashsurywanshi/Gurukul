<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hostel_room_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('label')->nullable();
            $table->unsignedSmallInteger('default_capacity')->default(1);
            $table->decimal('default_fee', 10, 2)->default(0);
            $table->boolean('is_system')->default(false);
            $table->boolean('status')->default(true);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'name']);
        });

        Schema::table('hostel_rooms', function (Blueprint $table) {
            $table->string('room_type', 64)->default('double')->change();
        });
    }

    public function down(): void
    {
        Schema::table('hostel_rooms', function (Blueprint $table) {
            $table->enum('room_type', ['single', 'double', 'triple', 'dormitory'])->default('double')->change();
        });

        Schema::dropIfExists('hostel_room_types');
    }
};