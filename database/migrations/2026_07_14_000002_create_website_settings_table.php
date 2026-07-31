<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->longText('value')->nullable();
            $table->string('group')->default('shared');
            $table->timestamps();

            $table->unique(['organization_id', 'key']);
            $table->index(['organization_id', 'group']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_settings');
    }
};
