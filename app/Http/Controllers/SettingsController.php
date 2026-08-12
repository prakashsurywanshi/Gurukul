<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\WebsitePage;
use App\Models\WebsiteSetting;
use App\Services\KnowledgeBaseService;
use App\Services\QwaService;
use App\Services\StaffPermissionService;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly KnowledgeBaseService $knowledgeBaseService,
        private readonly QwaService $qwaService
    )
    {
    }

    public function index()
    {
        $user = Auth::user();
        $resolvedOrganization = $this->resolveOrganizationForUser($user);
        $organization = null;
        $sessionRecords = collect();

        if ($resolvedOrganization) {
            $organization = Organization::query()
                ->whereKey($resolvedOrganization->id)
                ->first([
                    'id',
                    'slug',
                    'name',
                    'email',
                    'phone',
                    'address',
                    'city',
                    'state',
                    'pincode',
                    'website',
                    'logo',
                    'settings',
                ]);

            $sessionRecords = AcademicYear::query()
                ->where('organization_id', $resolvedOrganization->id)
                ->orderByDesc('start_date')
                ->get([
                    'id',
                    'name',
                    'is_current',
                ]);
        }

        return inertia('dashboard/Settings', [
            'user' => $user,
            'organization' => $organization,
            'sessionRecords' => $sessionRecords,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('organizations', 'email')->ignore($organization->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'website' => ['nullable', 'url', 'max:255'],
            'academicSession' => [
                'required',
                'regex:/^\d{4}-\d{4}$/',
                Rule::exists('academic_years', 'name')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
            'dateFormat' => ['required', Rule::in(['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'])],
            'logo' => ['nullable', 'string'],
        ]);

        $sessionNames = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->pluck('name')
            ->values()
            ->all();

        $settings = [
            ...($organization->settings ?? []),
            'session' => $validated['academicSession'],
            'sessions' => $sessionNames,
            'date_format' => $validated['dateFormat'],
        ];

        $logo = $this->resolveOrganizationLogo($validated['logo'] ?? null, $organization);

        $organization->update([
            'name' => $validated['name'],
            'slug' => $organization->slug ?: Str::slug($validated['name']),
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'city' => $validated['city'],
            'state' => $validated['state'],
            'pincode' => $validated['pincode'],
            'website' => $validated['website'],
            'logo' => $logo,
            'settings' => $settings,
        ]);

        AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->update([
                'is_current' => false,
            ]);

        AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['academicSession'])
            ->update([
                'is_current' => true,
                'status' => 'active',
            ]);

        return redirect()->route('settings')->with('success', 'General settings updated successfully.');
    }

    private function resolveOrganizationLogo(?string $logo, Organization $organization): ?string
    {
        if (! $logo) {
            return $organization->logo;
        }

        if (! Str::startsWith($logo, 'data:image/')) {
            if (Str::length($logo) > 255) {
                throw ValidationException::withMessages([
                    'logo' => ['The logo value is too long. Please upload the image again.'],
                ]);
            }

            return $logo;
        }

        if (! preg_match('/^data:image\/(png|jpe?g|webp);base64,(.+)$/i', $logo, $matches)) {
            throw ValidationException::withMessages([
                'logo' => ['The logo must be a PNG, JPG, JPEG, or WebP image.'],
            ]);
        }

        $extension = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
        $decodedLogo = base64_decode($matches[2], true);

        if ($decodedLogo === false) {
            throw ValidationException::withMessages([
                'logo' => ['The logo image could not be read. Please upload it again.'],
            ]);
        }

        if (strlen($decodedLogo) > 5 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'logo' => ['The logo may not be greater than 5 MB.'],
            ]);
        }

        $path = 'organization-logos/'.$organization->id.'/logo-'.Str::uuid().'.'.$extension;
        Storage::disk('public')->put($path, $decodedLogo);
        $this->deleteOrganizationLogoAsset($organization->logo);

        return Storage::url($path);
    }

    private function deleteOrganizationLogoAsset(?string $logo): void
    {
        if (! $logo || ! Str::startsWith($logo, '/storage/organization-logos/')) {
            return;
        }

        Storage::disk('public')->delete(Str::after($logo, '/storage/'));
    }

    public function websiteCms()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/WebsiteCms', [
            'user' => $user,
            'websiteContent' => $organization ? $this->getWebsiteCmsContent($organization) : null,
        ]);
    }

    public function websiteCmsEditor()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $publishedPages = $organization
            ? WebsitePage::where('organization_id', $organization->id)
                ->published()
                ->ordered()
                ->get(['id', 'title', 'slug'])
                ->map(fn ($page) => [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                ])
                ->toArray()
            : [];

        return inertia('dashboard/WebsiteCmsEditor', [
            'user' => $user,
            'websiteContent' => $organization ? $this->getWebsiteCmsContent($organization) : null,
            'publishedPages' => $publishedPages,
        ]);
    }

    public function updateWebsiteCms(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $request->validate([
            'activeTemplate' => ['required', Rule::in(['template1', 'template2', 'template3', 'template4', 'template5'])],
            'theme' => ['required', Rule::in(['white', 'aurora', 'sunrise', 'emerald'])],
            'shared' => ['nullable', 'array'],
            'template1' => ['nullable', 'array'],
            'template2' => ['nullable', 'array'],
            'template3' => ['nullable', 'array'],
            'template4' => ['nullable', 'array'],
            'template5' => ['nullable', 'array'],
            'highlights' => ['nullable', 'array'],
            'features' => ['nullable', 'array'],
            'programs' => ['nullable', 'array'],
            'pillars' => ['nullable', 'array'],
            'campusStats' => ['nullable', 'array'],
            'news' => ['nullable', 'array'],
            'outcomes' => ['nullable', 'array'],
            'journeySteps' => ['nullable', 'array'],
            'testimonials' => ['nullable', 'array'],
            'faqs' => ['nullable', 'array'],
            'sliderImages' => ['nullable', 'array'],
            'sliderImages.*' => ['nullable', 'string'],
            'templateTwoSlides' => ['nullable', 'array'],
            'templateTwoAboutCards' => ['nullable', 'array'],
            'templateTwoGalleryItems' => ['nullable', 'array'],
            'templateTwoContactItems' => ['nullable', 'array'],
        ]);

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
            ],
        ]);

        WebsiteSetting::where('organization_id', $organization->id)->delete();

        WebsiteSetting::create([
            'organization_id' => $organization->id,
            'key' => 'activeTemplate',
            'value' => $request->input('activeTemplate'),
            'group' => 'meta',
        ]);

        WebsiteSetting::create([
            'organization_id' => $organization->id,
            'key' => 'theme',
            'value' => $request->input('theme'),
            'group' => 'meta',
        ]);

        $sliderImages = $request->input('sliderImages');
        if (is_array($sliderImages)) {
            WebsiteSetting::create([
                'organization_id' => $organization->id,
                'key' => 'sliderImages',
                'value' => json_encode($sliderImages),
                'group' => 'meta',
            ]);
        }

        $shared = $request->input('shared');
        if (is_array($shared)) {
            WebsiteSetting::saveMany($organization->id, $shared, 'shared');
        }

        $templateGroups = ['template1', 'template2', 'template3', 'template4', 'template5'];
        foreach ($templateGroups as $group) {
            $templateData = $request->input($group);
            if (is_array($templateData)) {
                WebsiteSetting::saveMany($organization->id, $templateData, $group);
            }
        }

        $topLevelArrayKeys = [
            'highlights', 'features', 'programs', 'pillars', 'campusStats',
            'news', 'outcomes', 'journeySteps', 'testimonials', 'faqs',
            'templateTwoSlides', 'templateTwoAboutCards', 'templateTwoGalleryItems',
            'templateTwoContactItems',
        ];
        foreach ($topLevelArrayKeys as $key) {
            $value = $request->input($key);
            if (is_array($value)) {
                WebsiteSetting::create([
                    'organization_id' => $organization->id,
                    'key' => $key,
                    'value' => json_encode($value),
                    'group' => 'meta',
                ]);
            }
        }

        return redirect()->route('website-cms')->with('success', 'Website content updated successfully.');
    }

    public function storeWebsiteCmsSliderImage(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json([
                'message' => 'No organization is linked to this account.',
            ], 422);
        }

        $validated = $request->validate([
            'slider_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $path = $validated['slider_image']->store("website-slider-images/{$organization->id}", 'public');
        $websiteContent = $this->getWebsiteCmsContent($organization);
        $sliderImages = is_array($websiteContent['sliderImages'] ?? null) ? $websiteContent['sliderImages'] : [];
        $sliderImages[] = Storage::url($path);
        $websiteContent['sliderImages'] = array_values($sliderImages);

        WebsiteSetting::updateOrCreate(
            ['organization_id' => $organization->id, 'key' => 'sliderImages', 'group' => 'meta'],
            ['value' => json_encode($websiteContent['sliderImages'])]
        );

        return response()->json([
            'message' => 'Slider image uploaded successfully.',
            'sliderImages' => $websiteContent['sliderImages'],
        ]);
    }

    public function destroyWebsiteCmsSliderImage(Request $request, int $index): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json([
                'message' => 'No organization is linked to this account.',
            ], 422);
        }

        $websiteContent = $this->getWebsiteCmsContent($organization);
        $sliderImages = is_array($websiteContent['sliderImages'] ?? null) ? array_values($websiteContent['sliderImages']) : [];

        if (! array_key_exists($index, $sliderImages)) {
            return response()->json([
                'message' => 'Slider image not found.',
            ], 404);
        }

        $this->deleteWebsiteCmsSliderAsset($sliderImages[$index]);
        unset($sliderImages[$index]);
        $websiteContent['sliderImages'] = array_values($sliderImages);

        WebsiteSetting::updateOrCreate(
            ['organization_id' => $organization->id, 'key' => 'sliderImages', 'group' => 'meta'],
            ['value' => json_encode($websiteContent['sliderImages'])]
        );

        return response()->json([
            'message' => 'Slider image deleted successfully.',
            'sliderImages' => $websiteContent['sliderImages'],
        ]);
    }

    public function publicHome()
    {
        $organization = Organization::query()
            ->orderBy('id')
            ->first();

        $user = Auth::user();

        $publishedPages = $organization
            ? WebsitePage::where('organization_id', $organization->id)
                ->published()
                ->ordered()
                ->get(['id', 'title', 'slug'])
                ->map(fn ($page) => [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                ])
                ->toArray()
            : [];

        $menuPages = $organization
            ? WebsitePage::where('organization_id', $organization->id)
                ->inMenu()
                ->ordered()
                ->get(['id', 'title', 'slug'])
                ->map(fn ($page) => [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                ])
                ->toArray()
            : [];

        return inertia('Home', [
            'websiteContent' => $this->publicWebsiteContent($organization),
            'user' => $user,
            'publishedPages' => $publishedPages,
            'menuPages' => $menuPages,
        ]);
    }

    public function publicAdmissionForm()
    {
        $organization = Organization::query()
            ->orderBy('id')
            ->first();

        $user = Auth::user();

        $publishedPages = $organization
            ? WebsitePage::where('organization_id', $organization->id)
                ->published()
                ->ordered()
                ->get(['id', 'title', 'slug'])
                ->map(fn ($page) => [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                ])
                ->toArray()
            : [];

        $menuPages = $organization
            ? WebsitePage::where('organization_id', $organization->id)
                ->inMenu()
                ->ordered()
                ->get(['id', 'title', 'slug'])
                ->map(fn ($page) => [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                ])
                ->toArray()
            : [];

        return inertia('PublicAdmissionForm', [
            'websiteContent' => $this->publicWebsiteContent($organization),
            'user' => $user,
            'publishedPages' => $publishedPages,
            'menuPages' => $menuPages,
        ]);
    }

    public function publicPrivacyPolicy()
    {
        $organization = Organization::query()
            ->orderBy('id')
            ->first();

        $user = Auth::user();

        return inertia('PrivacyPolicy', [
            'websiteContent' => $this->publicWebsiteContent($organization),
            'user' => $user,
        ]);
    }

    private function publicWebsiteContent(?Organization $organization): ?array
    {
        if (! $organization) {
            return null;
        }

        $content = $this->getWebsiteCmsContent($organization);

        return [
            ...$content,
            'brandLogo' => $organization->logo,
            'schoolName' => $organization->name,
            'shared' => [
                ...($content['shared'] ?? []),
                'brandLogo' => $organization->logo,
                'schoolName' => $organization->name,
            ],
        ];
    }

    public function knowledgeBase()
    {
        $user = Auth::user();

        return inertia('dashboard/KnowledgeBase', [
            'user' => $user,
            'knowledgeBaseContent' => $this->knowledgeBaseService->content(),
        ]);
    }

    private function getWebsiteCmsContent(Organization $organization): array
    {
        $settings = WebsiteSetting::where('organization_id', $organization->id)->get();

        $content = [];
        $shared = [];
        $templates = [];

        foreach ($settings as $setting) {
            $value = $setting->value;

            if ($value !== null && in_array($setting->key, ['sliderImages'])) {
                $decoded = json_decode($value, true);
                $content[$setting->key] = is_array($decoded) ? $decoded : [];
                continue;
            }

            if ($setting->group === 'meta') {
                $decoded = json_decode($value, true);
                $content[$setting->key] = is_array($decoded) ? $decoded : $value;
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

    private function deleteWebsiteCmsSliderAsset(string $url): void
    {
        if (! str_starts_with($url, '/storage/')) {
            return;
        }

        $path = Str::after($url, '/storage/');

        if ($path !== '') {
            Storage::disk('public')->delete($path);
        }
    }

    public function updateWebsiteCmsSection(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['message' => 'No organization linked.'], 422);
        }

        $validated = $request->validate([
            'section' => ['required', 'string'],
            'data' => ['required', 'array'],
        ]);

        $websiteContent = $this->getWebsiteCmsContent($organization);
        $section = $validated['section'];
        $data = $validated['data'];

        $websiteContent[$section] = $data;

        if (str_starts_with($section, 'template')) {
            WebsiteSetting::saveMany($organization->id, $data, $section);
        } elseif ($section === 'shared') {
            WebsiteSetting::saveMany($organization->id, $data, 'shared');
        } else {
            WebsiteSetting::updateOrCreate(
                ['organization_id' => $organization->id, 'key' => $section, 'group' => 'meta'],
                ['value' => is_array($data) ? json_encode($data) : $data]
            );
        }

        return response()->json([
            'message' => "Section '{$section}' updated successfully.",
            'content' => $websiteContent[$section],
        ]);
    }

    public function sessions()
    {
        $user = Auth::user();
        $resolvedOrganization = $this->resolveOrganizationForUser($user);
        $academicYears = collect();

        if ($resolvedOrganization) {
            $academicYears = AcademicYear::query()
                ->where('organization_id', $resolvedOrganization->id)
                ->orderByDesc('start_date')
                ->get([
                    'id',
                    'name',
                    'start_date',
                    'end_date',
                    'is_current',
                    'status',
                ]);
        }

        return inertia('dashboard/Sessions', [
            'user' => $user,
            'sessionRecords' => $academicYears,
        ]);
    }

    public function storeSession(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'regex:/^\d{4}-\d{4}$/',
                Rule::unique('academic_years', 'name')->where(
                    fn ($query) => $query->where('organization_id', $organization->id)
                ),
            ],
        ]);

        [$startDate, $endDate] = $this->buildSessionDates($validated['name']);

        AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_current' => AcademicYear::query()
                ->where('organization_id', $organization->id)
                ->doesntExist(),
            'status' => 'active',
        ]);

        $this->syncOrganizationSessionSettings($organization->fresh());

        return redirect()->route('sessions')->with('success', 'Session created successfully.');
    }

    public function updateSession(Request $request, AcademicYear $academicYear): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->ensureAcademicYearBelongsToOrganization($academicYear, $organization->id);

        $validated = $request->validate([
            'name' => [
                'required',
                'regex:/^\d{4}-\d{4}$/',
                Rule::unique('academic_years', 'name')
                    ->ignore($academicYear->id)
                    ->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'completed'])],
        ]);

        [$startDate, $endDate] = $this->buildSessionDates($validated['name']);

        $academicYear->update([
            'name' => $validated['name'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => $validated['status'] ?? $academicYear->status,
        ]);

        if ($academicYear->is_current) {
            $settings = [
                ...($organization->settings ?? []),
                'session' => $validated['name'],
            ];

            $organization->update([
                'settings' => $settings,
            ]);
        }

        $this->syncOrganizationSessionSettings($organization->fresh());

        return redirect()->route('sessions')->with('success', 'Session updated successfully.');
    }

    public function destroySession(AcademicYear $academicYear): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->ensureAcademicYearBelongsToOrganization($academicYear, $organization->id);

        $remainingCount = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->count();

        if ($remainingCount <= 1) {
            return back()->with('error', 'At least one session is required.');
        }

        $wasCurrent = $academicYear->is_current;
        $academicYear->delete();

        if ($wasCurrent) {
            AcademicYear::query()
                ->where('organization_id', $organization->id)
                ->orderByDesc('start_date')
                ->first()?->update(['is_current' => true]);
        }

        $this->syncOrganizationSessionSettings($organization->fresh());

        return redirect()->route('sessions')->with('success', 'Session deleted successfully.');
    }

    public function activateSession(AcademicYear $academicYear): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->ensureAcademicYearBelongsToOrganization($academicYear, $organization->id);

        AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->update(['is_current' => false]);

        $academicYear->update([
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->syncOrganizationSessionSettings($organization->fresh());

        return redirect()->route('sessions')->with('success', 'Active session updated successfully.');
    }

    public function activateSessionAndBack(AcademicYear $academicYear): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->ensureAcademicYearBelongsToOrganization($academicYear, $organization->id);

        AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->update(['is_current' => false]);

        $academicYear->update([
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->syncOrganizationSessionSettings($organization->fresh());

        return back()->with('success', 'Current session updated successfully.');
    }

    public function apiSessions(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $academicYears = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->get([
                'id',
                'name',
                'start_date',
                'end_date',
                'is_current',
                'status',
            ]);

        return response()->json([
            'success' => true,
            'data' => $academicYears->map(fn ($year) => [
                'id' => $year->id,
                'name' => $year->name,
                'start_date' => $year->start_date->format('Y-m-d'),
                'end_date' => $year->end_date->format('Y-m-d'),
                'is_current' => $year->is_current,
                'status' => $year->status,
            ]),
        ]);
    }

    public function apiActivateSession(AcademicYear $academicYear): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->ensureAcademicYearBelongsToOrganization($academicYear, $organization->id);

        AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->update(['is_current' => false]);

        $academicYear->update([
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->syncOrganizationSessionSettings($organization->fresh());

        return response()->json([
            'success' => true,
            'message' => 'Active session updated successfully.',
            'current_session' => $academicYear->name,
        ]);
    }

    private function ensureAcademicYearBelongsToOrganization(AcademicYear $academicYear, int $organizationId): void
    {
        abort_unless($organizationId && $academicYear->organization_id === $organizationId, 403);
    }

    private function syncOrganizationSessionSettings(Organization $organization): void
    {
        $sessions = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->pluck('name')
            ->values()
            ->all();

        $currentSession = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('name');

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'session' => $currentSession,
                'sessions' => $sessions,
            ],
        ]);
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

    private function buildSessionDates(string $sessionName): array
    {
        [$startYear, $endYear] = array_map('intval', explode('-', $sessionName));

        if ($endYear !== $startYear + 1) {
            abort(422, 'Session year range must be consecutive.');
        }

        return [
            sprintf('%d-04-01', $startYear),
            sprintf('%d-03-31', $endYear),
        ];
    }

    public function communicationSettings()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $communicationSettings = $this->defaultCommunicationSettings();

        if ($organization) {
            $communicationSettings = array_replace_recursive(
                $communicationSettings,
                $organization->settings['communication_settings'] ?? []
            );
        }

        $communicationSettings['qwa']['apiKey'] = $this->decryptSecret($communicationSettings['qwa']['apiKey'] ?? '');
        $communicationSettings['qwa']['webhookSecret'] = $this->decryptSecret($communicationSettings['qwa']['webhookSecret'] ?? '');

        return inertia('dashboard/CommunicationSettings', [
            'user' => $user,
            'communicationSettings' => $communicationSettings,
        ]);
    }

    public function updateCommunicationSettings(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'sms.enabled' => ['required', 'boolean'],
            'sms.provider' => ['required', 'string', 'max:255'],
            'sms.senderId' => ['nullable', 'string', 'max:50'],
            'sms.apiKey' => ['nullable', 'string', 'max:500'],
            'email.enabled' => ['required', 'boolean'],
            'email.mailer' => ['required', 'string', 'max:100'],
            'email.host' => ['nullable', 'string', 'max:255'],
            'email.port' => ['nullable', 'string', 'max:10'],
            'email.username' => ['nullable', 'string', 'max:255'],
            'email.fromAddress' => ['nullable', 'email', 'max:255'],
            'email.fromName' => ['nullable', 'string', 'max:255'],
            'whatsapp.enabled' => ['required', 'boolean'],
            'whatsapp.provider' => ['required', 'string', 'max:255'],
            'whatsapp.phoneNumberId' => ['nullable', 'string', 'max:255'],
            'whatsapp.accessToken' => ['nullable', 'string', 'max:1000'],
            'whatsapp.businessNumber' => ['nullable', 'string', 'max:50'],
            'voice.enabled' => ['required', 'boolean'],
            'voice.provider' => ['required', 'string', 'max:255'],
            'voice.apiKey' => ['nullable', 'string', 'max:500'],
            'voice.callerId' => ['nullable', 'string', 'max:30'],
            'voice.ringTimeout' => ['nullable', 'integer', 'min:10', 'max:30'],
            'voice.callTimeout' => ['nullable', 'integer', 'min:10', 'max:3600'],
            'qwa.enabled' => ['required', 'boolean'],
            'qwa.baseUrl' => ['nullable', 'string', 'max:255'],
            'qwa.apiKey' => ['nullable', 'string', 'max:1000'],
            'qwa.sessionId' => ['nullable', 'string', 'max:100'],
            'qwa.webhookUrl' => ['nullable', 'string', 'max:255'],
            'qwa.webhookSecret' => ['nullable', 'string', 'max:1000'],
        ]);

        $qwa = $validated['qwa'] ?? [];

        if (filled($qwa['apiKey'] ?? '')) {
            $qwa['apiKey'] = Crypt::encryptString($qwa['apiKey']);
        } else {
            $qwa['apiKey'] = '';
        }

        if (filled($qwa['webhookSecret'] ?? '')) {
            $qwa['webhookSecret'] = Crypt::encryptString($qwa['webhookSecret']);
        } else {
            $qwa['webhookSecret'] = '';
        }

        $validated['qwa'] = $qwa;

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'communication_settings' => array_replace_recursive(
                    $this->defaultCommunicationSettings(),
                    $validated
                ),
            ],
        ]);

        return redirect()
            ->route('settings.communication')
            ->with('success', 'Communication settings updated successfully.');
    }

    public function validateQwaConnection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'baseUrl' => ['required', 'string', 'max:255'],
            'apiKey' => ['required', 'string', 'max:1000'],
            'sessionId' => ['nullable', 'string', 'max:100'],
        ]);

        $baseUrl = $validated['baseUrl'];
        $apiKey = $validated['apiKey'];
        $sessionId = trim((string) ($validated['sessionId'] ?? ''));

        $keyCheck = $this->qwaService->validateApiKey($baseUrl, $apiKey);

        if (!$keyCheck['success']) {
            $message = $keyCheck['statusCode'] === 503
                ? $keyCheck['message']
                : 'API key is invalid. Check the key and try again.';

            return response()->json([
                'valid' => false,
                'apiKeyStatus' => $keyCheck['statusCode'],
                'sessionStatus' => null,
                'message' => $message,
            ]);
        }

        $sessionStatus = null;
        $message = 'QWA connection is valid. API key accepted.';

        if ($sessionId !== '') {
            $sessionCheck = $this->qwaService->sessionStatus($baseUrl, $apiKey, $sessionId);

            if ($sessionCheck['success']) {
                $status = is_array($sessionCheck['body']) ? ($sessionCheck['body']['status'] ?? 'ready') : 'ready';
                $sessionStatus = $sessionCheck['statusCode'];
                $message = 'QWA connection is valid. Session found (status: ' . $status . ').';
            } else {
                $sessionStatus = $sessionCheck['statusCode'];
                $message = 'QWA connection is valid, but the session could not be found.';
            }
        }

        return response()->json([
            'valid' => true,
            'apiKeyStatus' => $keyCheck['statusCode'],
            'sessionStatus' => $sessionStatus,
            'message' => $message,
        ]);
    }

    public function qwaSessionStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'baseUrl' => ['required', 'string', 'max:255'],
            'apiKey' => ['required', 'string', 'max:1000'],
            'sessionId' => ['nullable', 'string', 'max:100'],
        ]);

        $baseUrl = $validated['baseUrl'];
        $apiKey = $validated['apiKey'];
        $sessionId = trim((string) ($validated['sessionId'] ?? ''));

        if ($sessionId === '') {
            return response()->json([
                'connected' => false,
                'status' => 'not_configured',
                'statusLabel' => 'Not Configured',
                'phone' => null,
                'pushName' => null,
                'lastError' => 'No QWA session ID/name configured.',
                'message' => 'Enter a QWA session ID/name before checking the status.',
            ]);
        }

        $sessionCheck = $this->qwaService->sessionStatus($baseUrl, $apiKey, $sessionId);

        if (!$sessionCheck['success']) {
            $statusLabel = match ($sessionCheck['statusCode']) {
                401 => 'Unauthorized',
                404 => 'Not Found',
                503 => 'Unreachable',
                default => 'Error',
            };

            $message = $sessionCheck['statusCode'] === 503
                ? $sessionCheck['message']
                : ($sessionCheck['statusCode'] === 401
                    ? 'API key is invalid or not authorized for this session.'
                    : ($sessionCheck['statusCode'] === 404
                        ? 'QWA session not found. Check the session ID/name.'
                        : 'Unable to fetch QWA session status.'));

            return response()->json([
                'connected' => false,
                'status' => 'error',
                'statusLabel' => $statusLabel,
                'phone' => null,
                'pushName' => null,
                'lastError' => $message,
                'message' => $message,
            ]);
        }

        $body = is_array($sessionCheck['body']) ? $sessionCheck['body'] : [];
        $status = (string) ($body['status'] ?? 'disconnected');

        return response()->json([
            'connected' => $this->qwaIsConnected($status),
            'status' => $status,
            'statusLabel' => $this->qwaStatusLabel($status),
            'phone' => $body['phone'] ?? null,
            'pushName' => $body['pushName'] ?? null,
            'lastError' => $body['lastError'] ?? null,
            'message' => $this->qwaIsConnected($status)
                ? 'QWA session is connected.'
                : 'QWA session status: ' . $status,
        ]);
    }

    public function qwaStartSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'baseUrl' => ['required', 'string', 'max:255'],
            'apiKey' => ['required', 'string', 'max:1000'],
            'sessionId' => ['nullable', 'string', 'max:100'],
        ]);

        $baseUrl = $validated['baseUrl'];
        $apiKey = $validated['apiKey'];
        $sessionId = trim((string) ($validated['sessionId'] ?? ''));

        if ($sessionId === '') {
            return response()->json([
                'success' => false,
                'status' => 'not_configured',
                'statusLabel' => 'Not Configured',
                'qrCode' => null,
                'phone' => null,
                'pushName' => null,
                'lastError' => 'Enter a QWA session ID/name before starting the session.',
                'message' => 'Enter a QWA session ID/name before starting the session.',
            ]);
        }

        $startResult = $this->qwaService->startSession($baseUrl, $apiKey, $sessionId);

        if (!$startResult['success']) {
            $message = match ($startResult['statusCode']) {
                503 => $startResult['message'],
                401 => 'API key is invalid or not authorized for this session.',
                404 => 'QWA session not found. Create the session first, then check the session ID/name.',
                default => 'Unable to start the QWA session.',
            };

            return response()->json([
                'success' => false,
                'status' => 'error',
                'statusLabel' => 'Failed',
                'qrCode' => null,
                'phone' => null,
                'pushName' => null,
                'lastError' => $message,
                'message' => $message,
            ]);
        }

        $body = is_array($startResult['body']) ? $startResult['body'] : [];
        $status = (string) ($body['status'] ?? 'initializing');
        $qrCode = null;

        if (!$this->qwaIsConnected($status)) {
            $qrResult = $this->qwaService->sessionQr($baseUrl, $apiKey, $sessionId);

            if ($qrResult['success']) {
                $qrBody = is_array($qrResult['body']) ? $qrResult['body'] : [];
                $qrCode = $qrBody['qrCode'] ?? null;
                $status = (string) ($qrBody['status'] ?? $status);
            }
        }

        return response()->json([
            'success' => true,
            'status' => $status,
            'statusLabel' => $this->qwaStatusLabel($status),
            'connected' => $this->qwaIsConnected($status),
            'qrCode' => $qrCode,
            'phone' => $body['phone'] ?? null,
            'pushName' => $body['pushName'] ?? null,
            'lastError' => $body['lastError'] ?? null,
            'message' => $this->qwaIsConnected($status)
                ? 'QWA session started and is connected.'
                : 'QWA session started. Scan the QR code with WhatsApp to connect.',
        ]);
    }

    private function qwaIsConnected(string $status): bool
    {
        return $status === 'ready';
    }

    private function qwaStatusLabel(string $status): string
    {
        return match ($status) {
            'ready' => 'Connected',
            'initializing', 'qr_ready', 'authenticating' => 'Connecting',
            'failed' => 'Failed',
            default => 'Disconnected',
        };
    }

    public function rolesPermissions()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $this->ensureRolesPermissionsBootstrapped($organization);

        return inertia('dashboard/RolesPermissions', [
            'user' => $user,
            'rolePermissions' => $organization ? $this->staffPermissionService->buildRolePermissionsPayload($organization) : null,
            'roleRecords' => $organization ? $this->staffPermissionService->roleRecords($organization) : [],
            'permissionFeatures' => $this->staffPermissionService->permissionFeatures(),
        ]);
    }

    public function storeRole(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);

        $this->staffPermissionService->createRole($organization, trim($validated['name']));

        return redirect()
            ->route('settings.roles-permissions')
            ->with('success', 'Role created successfully.');
    }

    public function updateRole(Request $request, Role $role): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);

        $this->staffPermissionService->updateRole($organization, $role, trim($validated['name']));

        return redirect()
            ->route('settings.roles-permissions')
            ->with('success', 'Role updated successfully.');
    }

    public function destroyRole(Role $role): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        if (!$this->staffPermissionService->deleteRole($organization, $role)) {
            return back()->with('error', 'Default system roles cannot be deleted.');
        }

        return redirect()
            ->route('settings.roles-permissions')
            ->with('success', 'Role deleted successfully.');
    }

    public function updateRolesPermissions(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'rolePermissions' => ['required', 'array'],
        ]);

        $normalizedPermissions = $this->staffPermissionService->normalizeRolePermissions($organization, $validated['rolePermissions']);

        $this->staffPermissionService->syncPermissions($organization, $normalizedPermissions);

        return redirect()
            ->route('settings.roles-permissions')
            ->with('success', 'Roles and permissions updated successfully.');
    }

    private function ensureRolesPermissionsBootstrapped(?Organization $organization): void
    {
        if (!$organization) {
            return;
        }

        $legacyPermissions = $organization->settings['roles_permissions'] ?? null;
        $hasPersistedPermissions = RolePermission::query()
            ->whereHas('role', function ($query) use ($organization) {
                $query
                    ->where('organization_id', $organization->id)
                    ->whereIn('slug', RolePermissionCatalog::staffRoleSlugs());
            })
            ->exists();

        if (is_array($legacyPermissions) && !empty($legacyPermissions)) {
            $this->staffPermissionService->syncPermissions($organization, $legacyPermissions);

            $organization->update([
                'settings' => [
                    ...($organization->settings ?? []),
                    'roles_permissions' => null,
                ],
            ]);

            return;
        }

        if (!$hasPersistedPermissions) {
            $this->staffPermissionService->syncPermissions($organization, RolePermissionCatalog::defaults());
        }
    }

    private function decryptSecret(string $value): string
    {
        if ($value === '') {
            return '';
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    private function defaultCommunicationSettings(): array
    {
        return [
            'sms' => [
                'enabled' => true,
                'provider' => 'MSG91',
                'senderId' => 'GURUKL',
                'apiKey' => '',
            ],
            'email' => [
                'enabled' => true,
                'mailer' => 'SMTP',
                'host' => 'smtp.gmail.com',
                'port' => '587',
                'username' => 'school@example.com',
                'fromAddress' => 'noreply@gurukul.com',
                'fromName' => 'Gurukul ERP',
            ],
            'whatsapp' => [
                'enabled' => false,
                'provider' => 'Twilio',
                'phoneNumberId' => '',
                'accessToken' => '',
                'businessNumber' => '+91 98765 43210',
            ],
            'voice' => [
                'enabled' => false,
                'provider' => 'Smartflo',
                'apiKey' => '',
                'callerId' => '',
                'ringTimeout' => 30,
                'callTimeout' => 60,
            ],
            'qwa' => [
                'enabled' => false,
                'baseUrl' => 'https://qwa.qodeigence.com',
                'apiKey' => '',
                'sessionId' => '',
                'webhookUrl' => '',
                'webhookSecret' => '',
            ],
        ];
    }
}
