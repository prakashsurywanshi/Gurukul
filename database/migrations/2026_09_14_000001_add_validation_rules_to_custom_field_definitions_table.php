<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('custom_field_definitions', function (Blueprint $table) {
            $table->string('pattern', 255)->nullable()->after('options');
            $table->string('pattern_message', 255)->nullable()->after('pattern');
            $table->decimal('min_value', 15, 2)->nullable()->after('pattern_message');
            $table->decimal('max_value', 15, 2)->nullable()->after('min_value');
            $table->unsignedInteger('min_length')->nullable()->after('max_value');
            $table->unsignedInteger('max_length')->nullable()->after('min_length');
        });
    }

    public function down(): void
    {
        Schema::table('custom_field_definitions', function (Blueprint $table) {
            $table->dropColumn([
                'pattern',
                'pattern_message',
                'min_value',
                'max_value',
                'min_length',
                'max_length',
            ]);
        });
    }
};