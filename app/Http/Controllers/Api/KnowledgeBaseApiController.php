<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeBaseFaq;
use App\Models\KnowledgeBaseModule;
use App\Models\KnowledgeBasePageSetting;
use App\Services\KnowledgeBaseService;
use App\Support\KnowledgeBaseContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeBaseApiController extends Controller
{
    public function index(): JsonResponse
    {
        $service = new KnowledgeBaseService();
        $content = $service->content();

        return response()->json([
            'success' => true,
            'data' => $content,
        ]);
    }

    public function modules(): JsonResponse
    {
        $defaults = KnowledgeBaseContent::defaults();
        $page = KnowledgeBasePageSetting::query()->orderBy('id')->first();

        $modules = KnowledgeBaseModule::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($module) => [
                'id' => $module->entry_key,
                'title' => $module->title,
                'summary' => $module->summary ?? '',
                'content' => $module->content,
            ]);

        if ($modules->isEmpty()) {
            $modules = collect($defaults['modules'])->map(fn ($m) => [
                'id' => $m['id'],
                'title' => $m['title'],
                'summary' => $m['summary'] ?? '',
                'content' => $m['content'],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $modules,
        ]);
    }

    public function faqs(): JsonResponse
    {
        $defaults = KnowledgeBaseContent::defaults();

        $faqs = KnowledgeBaseFaq::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($faq) => [
                'id' => $faq->entry_key,
                'question' => $faq->question,
                'answer' => $faq->answer,
            ]);

        if ($faqs->isEmpty()) {
            $faqs = collect($defaults['faqs'])->map(fn ($f) => [
                'id' => $f['id'],
                'question' => $f['question'],
                'answer' => $f['answer'],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $faqs,
        ]);
    }

    public function settings(): JsonResponse
    {
        $defaults = KnowledgeBaseContent::defaults();
        $page = KnowledgeBasePageSetting::query()->orderBy('id')->first();

        $settings = [
            'title' => $page?->title ?? $defaults['title'],
            'subtitle' => $page?->subtitle ?? $defaults['subtitle'],
            'search_placeholder' => $page?->search_placeholder ?? $defaults['search_placeholder'],
            'documentation_title' => $page?->documentation_title ?? $defaults['documentation_title'],
            'documentation_subtitle' => $page?->documentation_subtitle ?? $defaults['documentation_subtitle'],
            'faq_title' => $page?->faq_title ?? $defaults['faq_title'],
            'faq_subtitle' => $page?->faq_subtitle ?? $defaults['faq_subtitle'],
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        if (empty($query)) {
            return response()->json([
                'success' => true,
                'data' => ['modules' => [], 'faqs' => []],
            ]);
        }

        $modules = KnowledgeBaseModule::query()
            ->where('title', 'like', "%{$query}%")
            ->orWhere('summary', 'like', "%{$query}%")
            ->orWhere('content', 'like', "%{$query}%")
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($module) => [
                'id' => $module->entry_key,
                'title' => $module->title,
                'summary' => $module->summary ?? '',
                'content' => $module->content,
            ]);

        $faqs = KnowledgeBaseFaq::query()
            ->where('question', 'like', "%{$query}%")
            ->orWhere('answer', 'like', "%{$query}%")
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($faq) => [
                'id' => $faq->entry_key,
                'question' => $faq->question,
                'answer' => $faq->answer,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'modules' => $modules,
                'faqs' => $faqs,
            ],
        ]);
    }
}
