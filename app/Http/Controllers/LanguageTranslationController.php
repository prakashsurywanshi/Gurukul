<?php

namespace App\Http\Controllers;

use App\Models\LanguageTranslation;
use App\Models\Organization;
use App\Models\User;
use App\Services\LanguageService;
use App\Support\LanguageCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class LanguageTranslationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/LanguageTranslations', [
            'user' => $user,
            'languageSettings' => app(LanguageService::class)->payload($organization),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'translations' => ['required', 'array'],
            'translations.*.locale' => ['required', 'alpha', Rule::in(LanguageCatalog::languageCodes())],
            'translations.*.key' => ['required', 'string', 'max:600'],
            'translations.*.value' => ['nullable', 'string', 'max:5000'],
        ]);

        foreach ($validated['translations'] as $entry) {
            $locale = $entry['locale'];
            $key = $entry['key'];
            $value = trim((string) ($entry['value'] ?? ''));

            if ($value === '') {
                LanguageTranslation::query()
                    ->where('organization_id', $organization->id)
                    ->where('locale', $locale)
                    ->where('translation_key', $key)
                    ->delete();

                continue;
            }

            LanguageTranslation::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'locale' => $locale,
                    'translation_key' => $key,
                ],
                ['value' => $value]
            );
        }

        return redirect()
            ->route('settings.language-translations')
            ->with('success', 'Translations saved successfully.');
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

        if (! $organization) {
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