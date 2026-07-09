<?php

namespace App\Services;

use App\Models\KnowledgeBaseFaq;
use App\Models\KnowledgeBaseModule;
use App\Models\KnowledgeBasePageSetting;
use App\Models\SuperAdminSetting;
use App\Support\KnowledgeBaseContent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class KnowledgeBaseService
{
    public function content(): array
    {
        if (! $this->hasNormalizedTables()) {
            return $this->legacyContent();
        }

        $this->ensureContentExists();

        $defaults = KnowledgeBaseContent::defaults();
        $page = KnowledgeBasePageSetting::query()->orderBy('id')->first();

        return KnowledgeBaseContent::normalize([
            'title' => $page?->title ?? $defaults['title'],
            'subtitle' => $page?->subtitle ?? $defaults['subtitle'],
            'search_placeholder' => $page?->search_placeholder ?? $defaults['search_placeholder'],
            'documentation_title' => $page?->documentation_title ?? $defaults['documentation_title'],
            'documentation_subtitle' => $page?->documentation_subtitle ?? $defaults['documentation_subtitle'],
            'faq_title' => $page?->faq_title ?? $defaults['faq_title'],
            'faq_subtitle' => $page?->faq_subtitle ?? $defaults['faq_subtitle'],
            'modules' => KnowledgeBaseModule::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (KnowledgeBaseModule $module) => [
                    'id' => $module->entry_key,
                    'title' => $module->title,
                    'summary' => $module->summary ?? '',
                    'content' => $module->content,
                ])
                ->all(),
            'faqs' => KnowledgeBaseFaq::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (KnowledgeBaseFaq $faq) => [
                    'id' => $faq->entry_key,
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                ])
                ->all(),
        ], false);
    }

    public function save(array $content): void
    {
        if (! $this->hasNormalizedTables()) {
            return;
        }

        $normalized = KnowledgeBaseContent::normalize($content, false);

        DB::transaction(function () use ($normalized): void {
            $page = KnowledgeBasePageSetting::query()->orderBy('id')->first();
            $pageValues = [
                'title' => $normalized['title'],
                'subtitle' => $normalized['subtitle'],
                'search_placeholder' => $normalized['search_placeholder'],
                'documentation_title' => $normalized['documentation_title'],
                'documentation_subtitle' => $normalized['documentation_subtitle'],
                'faq_title' => $normalized['faq_title'],
                'faq_subtitle' => $normalized['faq_subtitle'],
            ];

            if ($page) {
                $page->update($pageValues);
            } else {
                KnowledgeBasePageSetting::query()->create($pageValues);
            }

            $moduleKeys = collect($normalized['modules'])->pluck('id')->all();
            KnowledgeBaseModule::query()
                ->when(
                    count($moduleKeys) > 0,
                    fn ($query) => $query->whereNotIn('entry_key', $moduleKeys),
                    fn ($query) => $query
                )
                ->delete();

            foreach ($normalized['modules'] as $index => $module) {
                KnowledgeBaseModule::query()->updateOrCreate(
                    ['entry_key' => $module['id']],
                    [
                        'title' => $module['title'],
                        'summary' => $module['summary'] ?? '',
                        'content' => $module['content'],
                        'sort_order' => $index,
                    ]
                );
            }

            $faqKeys = collect($normalized['faqs'])->pluck('id')->all();
            KnowledgeBaseFaq::query()
                ->when(
                    count($faqKeys) > 0,
                    fn ($query) => $query->whereNotIn('entry_key', $faqKeys),
                    fn ($query) => $query
                )
                ->delete();

            foreach ($normalized['faqs'] as $index => $faq) {
                KnowledgeBaseFaq::query()->updateOrCreate(
                    ['entry_key' => $faq['id']],
                    [
                        'question' => $faq['question'],
                        'answer' => $faq['answer'],
                        'sort_order' => $index,
                    ]
                );
            }
        });
    }

    public function ensureContentExists(?array $seedContent = null): void
    {
        if (! $this->hasNormalizedTables()) {
            return;
        }

        if (
            KnowledgeBasePageSetting::query()->exists()
            && KnowledgeBaseModule::query()->exists()
            && KnowledgeBaseFaq::query()->exists()
        ) {
            return;
        }

        $this->save($seedContent ?? $this->legacyContent());
    }

    private function legacyContent(): array
    {
        if (! Schema::hasTable('super_admin_settings') || ! Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            return KnowledgeBaseContent::defaults();
        }

        $settings = SuperAdminSetting::query()->orderBy('id')->first();
        $content = $settings?->getAttribute('knowledge_base_content');

        if (is_string($content)) {
            $content = json_decode($content, true);
        }

        return KnowledgeBaseContent::normalize(is_array($content) ? $content : null);
    }

    private function hasNormalizedTables(): bool
    {
        return Schema::hasTable('knowledge_base_page_settings')
            && Schema::hasTable('knowledge_base_modules')
            && Schema::hasTable('knowledge_base_faqs');
    }
}
