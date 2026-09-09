<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_pages', function (Blueprint $table) {
            $table->string('meta_keywords')->nullable()->after('meta_description');
            $table->string('banner_image')->nullable()->after('featured_image');
            $table->text('short_description')->nullable()->after('banner_image');
            $table->boolean('show_in_menu')->default(false)->after('is_published');
            $table->integer('menu_order')->default(0)->after('show_in_menu');
            $table->string('status', 20)->default('draft')->after('short_description');

            $table->dropIndex('website_pages_organization_id_is_published_sort_order_index');
            $table->dropColumn('is_published');
        });
    }

    public function down(): void
    {
        Schema::table('website_pages', function (Blueprint $table) {
            $table->boolean('is_published')->default(true)->after('featured_image');
            $table->dropColumn(['meta_keywords', 'banner_image', 'short_description', 'status', 'show_in_menu', 'menu_order']);
        });
    }
};
