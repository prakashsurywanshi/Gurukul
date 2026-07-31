<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Models\WebsitePage;
use App\Models\WebsiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class WebsitePageController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $pages = $organization
            ? WebsitePage::where('organization_id', $organization->id)
                ->withTrashed()
                ->orderByDesc('updated_at')
                ->get()
            : collect();

        return inertia('dashboard/Pages/Index', [
            'user' => $user,
            'pages' => $pages,
        ]);
    }

    public function create()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/Pages/Form', [
            'user' => $user,
            'page' => null,
            'organization' => $organization,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_keywords' => ['nullable', 'string', 'max:500'],
            'meta_description' => ['nullable', 'string', 'max:1000'],
            'featured_image' => ['nullable', 'string'],
            'banner_image' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'string', 'in:draft,published'],
            'show_in_menu' => ['nullable', 'boolean'],
            'menu_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['title']);

        $existingSlug = WebsitePage::where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->exists();

        if ($existingSlug) {
            $slug = $slug . '-' . time();
        }

        WebsitePage::create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'slug' => $slug,
            'content' => $validated['content'] ?? null,
            'meta_title' => $validated['meta_title'] ?? null,
            'meta_keywords' => $validated['meta_keywords'] ?? null,
            'meta_description' => $validated['meta_description'] ?? null,
            'featured_image' => $validated['featured_image'] ?? null,
            'banner_image' => $validated['banner_image'] ?? null,
            'short_description' => $validated['short_description'] ?? null,
            'status' => $validated['status'] ?? 'draft',
            'show_in_menu' => $validated['show_in_menu'] ?? false,
            'menu_order' => $validated['menu_order'] ?? 0,
        ]);

        return redirect()->route('pages.index')->with('success', 'Page created successfully.');
    }

    public function edit(WebsitePage $page)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || $page->organization_id !== $organization->id) {
            abort(403);
        }

        return inertia('dashboard/Pages/Form', [
            'user' => $user,
            'page' => $page,
            'organization' => $organization,
        ]);
    }

    public function update(Request $request, WebsitePage $page): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || $page->organization_id !== $organization->id) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_keywords' => ['nullable', 'string', 'max:500'],
            'meta_description' => ['nullable', 'string', 'max:1000'],
            'featured_image' => ['nullable', 'string'],
            'banner_image' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'string', 'in:draft,published'],
            'show_in_menu' => ['nullable', 'boolean'],
            'menu_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['title']);

        $existingSlug = WebsitePage::where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->where('id', '!=', $page->id)
            ->exists();

        if ($existingSlug) {
            $slug = $slug . '-' . time();
        }

        $input = $request->all();
        $page->update([
            'title' => $validated['title'],
            'slug' => $slug,
            'content' => array_key_exists('content', $input) ? $validated['content'] : $page->content,
            'meta_title' => array_key_exists('meta_title', $input) ? $validated['meta_title'] : $page->meta_title,
            'meta_keywords' => array_key_exists('meta_keywords', $input) ? $validated['meta_keywords'] : $page->meta_keywords,
            'meta_description' => array_key_exists('meta_description', $input) ? $validated['meta_description'] : $page->meta_description,
            'featured_image' => array_key_exists('featured_image', $input) ? $validated['featured_image'] : $page->featured_image,
            'banner_image' => array_key_exists('banner_image', $input) ? $validated['banner_image'] : $page->banner_image,
            'short_description' => array_key_exists('short_description', $input) ? $validated['short_description'] : $page->short_description,
            'status' => $validated['status'] ?? $page->status,
            'show_in_menu' => array_key_exists('show_in_menu', $input) ? $validated['show_in_menu'] : $page->show_in_menu,
            'menu_order' => array_key_exists('menu_order', $input) ? $validated['menu_order'] : $page->menu_order,
        ]);

        return redirect()->route('pages.index')->with('success', 'Page updated successfully.');
    }

    public function destroy(WebsitePage $page): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || $page->organization_id !== $organization->id) {
            abort(403);
        }

        $page->delete();

        return redirect()->route('pages.index')->with('success', 'Page deleted successfully.');
    }

    public function show(string $slug)
    {
        $organization = Organization::query()->first();

        if (!$organization) {
            abort(404);
        }

        $page = WebsitePage::where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->published()
            ->firstOrFail();

        $websiteCmsContent = $this->getWebsiteCmsContent($organization);
        $user = Auth::user();

        $menuPages = WebsitePage::where('organization_id', $organization->id)
            ->inMenu()
            ->ordered()
            ->get(['id', 'title', 'slug']);

        $allPublishedPages = WebsitePage::where('organization_id', $organization->id)
            ->published()
            ->ordered()
            ->get(['id', 'title', 'slug']);

        return inertia('WebsitePage', [
            'page' => $page,
            'websiteContent' => [
                ...$websiteCmsContent,
                'brandLogo' => $organization->logo,
                'schoolName' => $organization->name,
                'shared' => [
                    ...($websiteCmsContent['shared'] ?? []),
                    'brandLogo' => $organization->logo,
                    'schoolName' => $organization->name,
                ],
            ],
            'publishedPages' => $allPublishedPages,
            'menuPages' => $menuPages,
            'schoolName' => $organization->name,
            'schoolLogo' => $organization->logo,
            'user' => $user,
        ]);
    }

    public function storeApi(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['message' => 'No organization is linked to this account.'], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'template' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:draft,published'],
        ]);

        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['title']);

        $existingSlug = WebsitePage::where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->exists();

        if ($existingSlug) {
            $slug = $slug . '-' . time();
        }

        $page = WebsitePage::create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'slug' => $slug,
            'content' => null,
            'status' => $validated['status'] ?? 'published',
            'show_in_menu' => true,
            'menu_order' => WebsitePage::where('organization_id', $organization->id)->max('menu_order') + 1,
        ]);

        return response()->json([
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
        ], 201);
    }

    public function updateSections(Request $request, WebsitePage $websitePage): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || $websitePage->organization_id !== $organization->id) {
            abort(403);
        }

        $validated = $request->validate([
            'sections' => ['required', 'array'],
        ]);

        $websitePage->update(['content' => ['sections' => $validated['sections']]]);

        return response()->json(['message' => 'Sections updated successfully.']);
    }

    public function updateContent(Request $request, WebsitePage $websitePage): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || $websitePage->organization_id !== $organization->id) {
            abort(403);
        }

        $validated = $request->validate([
            'content' => ['nullable'],
        ]);

        $input = $request->all();
        $websitePage->update([
            'content' => array_key_exists('content', $input) ? $validated['content'] : $websitePage->content,
        ]);

        return response()->json(['message' => 'Content updated successfully.']);
    }

    private function getWebsiteCmsContent(Organization $organization): array
    {
        $settings = WebsiteSetting::where('organization_id', $organization->id)->get();

        $content = [];
        $shared = [];
        $templates = [];

        foreach ($settings as $setting) {
            $value = $setting->value;

            if ($setting->group === 'meta') {
                if ($setting->key === 'sliderImages') {
                    $decoded = json_decode($value, true);
                    $content[$setting->key] = is_array($decoded) ? $decoded : [];
                } else {
                    $decoded = json_decode($value, true);
                    $content[$setting->key] = is_array($decoded) ? $decoded : $value;
                }
            } elseif ($setting->group === 'shared') {
                $decoded = json_decode($value, true);
                $shared[$setting->key] = is_array($decoded) ? $decoded : $value;
            } elseif (str_starts_with($setting->group, 'template')) {
                $decoded = json_decode($value, true);
                $templates[$setting->group][$setting->key] = is_array($decoded) ? $decoded : $value;
            }
        }

        $content['shared'] = $shared;
        foreach ($templates as $group => $data) {
            $content[$group] = $data;
        }

        return $content;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (!$organization) {
            $organizationCount = Organization::query()->count();

            if ($organizationCount === 1) {
                $organization = Organization::query()->first();
            }
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
