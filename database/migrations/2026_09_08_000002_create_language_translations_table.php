<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('language_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('locale', 10);
            $table->string('translation_key', 600);
            $table->text('value');
            $table->timestamps();

            $table->unique(['organization_id', 'locale', 'translation_key'], 'language_translations_org_locale_key_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('language_translations');
    }
};