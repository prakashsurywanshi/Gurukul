<?php

use App\Support\KnowledgeBaseContent;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_base_page_settings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('subtitle');
            $table->string('search_placeholder');
            $table->string('documentation_title');
            $table->text('documentation_subtitle');
            $table->string('faq_title');
            $table->text('faq_subtitle');
            $table->timestamps();
        });

        Schema::create('knowledge_base_modules', function (Blueprint $table) {
            $table->id();
            $table->string('entry_key')->unique();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->longText('content');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('knowledge_base_faqs', function (Blueprint $table) {
            $table->id();
            $table->string('entry_key')->unique();
            $table->string('question');
            $table->longText('answer');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $content = $this->legacyContent();
        $now = now();

        DB::table('knowledge_base_page_settings')->insert([
            'title' => $content['title'],
            'subtitle' => $content['subtitle'],
            'search_placeholder' => $content['search_placeholder'],
            'documentation_title' => $content['documentation_title'],
            'documentation_subtitle' => $content['documentation_subtitle'],
            'faq_title' => $content['faq_title'],
            'faq_subtitle' => $content['faq_subtitle'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        foreach ($content['modules'] as $index => $module) {
            DB::table('knowledge_base_modules')->insert([
                'entry_key' => $module['id'],
                'title' => $module['title'],
                'summary' => $module['summary'] ?? '',
                'content' => $module['content'],
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ($content['faqs'] as $index => $faq) {
            DB::table('knowledge_base_faqs')->insert([
                'entry_key' => $faq['id'],
                'question' => $faq['question'],
                'answer' => $faq['answer'],
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        if (Schema::hasTable('super_admin_settings') && Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            Schema::table('super_admin_settings', function (Blueprint $table) {
                $table->dropColumn('knowledge_base_content');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('super_admin_settings') && ! Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            Schema::table('super_admin_settings', function (Blueprint $table) {
                $table->json('knowledge_base_content')->nullable()->after('reply_to_email');
            });
        }

        if (Schema::hasTable('super_admin_settings') && Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            $content = $this->normalizedContent();
            $row = DB::table('super_admin_settings')->orderBy('id')->first();

            if ($row) {
                DB::table('super_admin_settings')
                    ->where('id', $row->id)
                    ->update([
                        'knowledge_base_content' => json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        'updated_at' => now(),
                    ]);
            } else {
                DB::table('super_admin_settings')->insert([
                    'mailer' => 'smtp',
                    'is_active' => true,
                    'knowledge_base_content' => json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::dropIfExists('knowledge_base_faqs');
        Schema::dropIfExists('knowledge_base_modules');
        Schema::dropIfExists('knowledge_base_page_settings');
    }

    private function legacyContent(): array
    {
        if (! Schema::hasTable('super_admin_settings') || ! Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            return KnowledgeBaseContent::defaults();
        }

        $row = DB::table('super_admin_settings')->orderBy('id')->first();
        $content = $row?->knowledge_base_content ?? null;

        if (is_string($content)) {
            $content = json_decode($content, true);
        }

        return KnowledgeBaseContent::normalize(is_array($content) ? $content : null);
    }

    private function normalizedContent(): array
    {
        $defaults = KnowledgeBaseContent::defaults();
        $page = Schema::hasTable('knowledge_base_page_settings')
            ? DB::table('knowledge_base_page_settings')->orderBy('id')->first()
            : null;

        return KnowledgeBaseContent::normalize([
            'title' => $page?->title ?? $defaults['title'],
            'subtitle' => $page?->subtitle ?? $defaults['subtitle'],
            'search_placeholder' => $page?->search_placeholder ?? $defaults['search_placeholder'],
            'documentation_title' => $page?->documentation_title ?? $defaults['documentation_title'],
            'documentation_subtitle' => $page?->documentation_subtitle ?? $defaults['documentation_subtitle'],
            'faq_title' => $page?->faq_title ?? $defaults['faq_title'],
            'faq_subtitle' => $page?->faq_subtitle ?? $defaults['faq_subtitle'],
            'modules' => Schema::hasTable('knowledge_base_modules')
                ? DB::table('knowledge_base_modules')
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($module) => [
                        'id' => $module->entry_key,
                        'title' => $module->title,
                        'summary' => $module->summary ?? '',
                        'content' => $module->content,
                    ])
                    ->all()
                : $defaults['modules'],
            'faqs' => Schema::hasTable('knowledge_base_faqs')
                ? DB::table('knowledge_base_faqs')
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($faq) => [
                        'id' => $faq->entry_key,
                        'question' => $faq->question,
                        'answer' => $faq->answer,
                    ])
                    ->all()
                : $defaults['faqs'],
        ]);
    }
};
