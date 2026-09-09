<?php

namespace App\Services;

use App\Models\LanguageTranslation;
use App\Models\Organization;
use App\Support\LanguageCatalog;

class LanguageService
{
    /**
     * Normalized language settings for an organization.
     *
     * @return array<string, mixed>
     */
    public function settingsFor(?Organization $organization): array
    {
        if (! $organization) {
            return LanguageCatalog::defaultLanguageSettings();
        }

        return LanguageCatalog::normalize($organization->settings['language_settings'] ?? null);
    }

    /**
     * Full normalized language settings payload to share with the frontend.
     *
     * @return array<string, mixed>
     */
    public function payload(?Organization $organization, ?string $resolvedLocale = null): array
    {
        $settings = $this->settingsFor($organization);

        return [
            'dual_language_enabled' => $settings['dual_language_enabled'],
            'regional_language' => $settings['regional_language'],
            'regional_language_name' => LanguageCatalog::name($settings['regional_language']),
            'universal_language_enabled' => $settings['universal_language_enabled'],
            'available_universal_languages' => $settings['available_universal_languages'],
            'primary_language' => LanguageCatalog::PRIMARY_LANGUAGE,
            'languages' => LanguageCatalog::languages(),
            'manual_translations' => $this->manualTranslations($organization),
            'locale' => $this->resolveRequestLocale($resolvedLocale, $settings),
        ];
    }

    /**
     * Manual per-key translation overrides applied on top of the built-in
     * dictionaries. Grouped by locale: [locale => [translation_key => value]].
     * Organization-specific overrides win over system-wide (null) overrides.
     *
     * @return array<string, array<string, string>>
     */
    public function manualTranslations(?Organization $organization): array
    {
        $query = LanguageTranslation::query();

        if ($organization) {
            $query->where(function ($builder) use ($organization) {
                $builder
                    ->where('organization_id', $organization->id)
                    ->orWhereNull('organization_id');
            });
        } else {
            $query->whereNull('organization_id');
        }

        $grouped = [];

        foreach ($query->get(['locale', 'translation_key', 'value']) as $translation) {
            $grouped[$translation->locale][$translation->translation_key] = $translation->value;
        }

        return $grouped;
    }

    /**
     * Resolve the current UI locale: an explicitly selected `locale` cookie
     * wins, otherwise the primary (universal) language is used by default.
     * The regional language only drives student records / certificates and
     * never the dashboard or site UI.
     */
    private function resolveRequestLocale(?string $resolvedLocale, array $settings): string
    {
        if ($resolvedLocale !== null && LanguageCatalog::isValidCode($resolvedLocale)) {
            return $resolvedLocale;
        }

        $cookie = request()->cookie('locale');
        if (is_string($cookie) && LanguageCatalog::isValidCode($cookie)) {
            return $cookie;
        }

        return LanguageCatalog::PRIMARY_LANGUAGE;
    }

    public function dualLanguageEnabled(?Organization $organization): bool
    {
        return (bool) $this->settingsFor($organization)['dual_language_enabled'];
    }

    public function universalLanguageEnabled(?Organization $organization): bool
    {
        return (bool) $this->settingsFor($organization)['universal_language_enabled'];
    }

    public function regionalLanguage(?Organization $organization): string
    {
        return $this->settingsFor($organization)['regional_language'];
    }

    /**
     * @return string[]
     */
    public function availableUniversalLanguages(?Organization $organization): array
    {
        return $this->settingsFor($organization)['available_universal_languages'];
    }

    /**
     * Determine if a given language code is selectable for universal (site) display.
     */
    public function isAvailableUniversalLanguage(?Organization $organization, ?string $code): bool
    {
        if (! $code) {
            return false;
        }

        return in_array($code, $this->availableUniversalLanguages($organization), true);
    }
}
