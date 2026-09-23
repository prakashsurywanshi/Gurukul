<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Extends certificate_templates into the unified template store powering the
     * Template Gallery + Canvas Designer. Legacy columns (type, template_design,
     * design_settings) are retained for existing certificate flows.
     */
    public function up(): void
    {
        Schema::table('certificate_templates', function (Blueprint $table) {
            $table->string('category')->nullable()->index()->after('type');
            $table->string('editor_type')->default('legacy')->after('category');
            $table->longText('content')->nullable()->after('design_settings');
            $table->longText('content_json')->nullable()->after('content');
            $table->longText('back_content')->nullable()->after('content_json');
            $table->longText('back_content_json')->nullable()->after('back_content');
            $table->longText('thumbnail_data')->nullable()->after('back_content_json');
            $table->decimal('card_width_mm', 6, 1)->unsigned()->nullable()->after('thumbnail_data');
            $table->decimal('card_height_mm', 6, 1)->unsigned()->nullable()->after('card_width_mm');
            $table->boolean('is_system')->default(false)->index()->after('card_height_mm');
        });
    }

    public function down(): void
    {
        Schema::table('certificate_templates', function (Blueprint $table) {
            $table->dropColumn([
                'category',
                'editor_type',
                'content',
                'content_json',
                'back_content',
                'back_content_json',
                'thumbnail_data',
                'card_width_mm',
                'card_height_mm',
                'is_system',
            ]);
        });
    }
};