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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('India');
            $table->string('pincode')->nullable();
            $table->string('website')->nullable();
            $table->string('logo')->nullable();
            $table->enum('type', ['school', 'college', 'coaching', 'university'])->default('school');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->string('subscription_plan')->default('free'); // free, basic, premium, enterprise
            $table->date('subscription_start_date')->nullable();
            $table->date('subscription_end_date')->nullable();
            $table->integer('max_students')->default(100);
            $table->integer('max_staff')->default(10);
            $table->json('features')->nullable(); // Array of enabled features
            $table->json('settings')->nullable(); // Organization-specific settings
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
