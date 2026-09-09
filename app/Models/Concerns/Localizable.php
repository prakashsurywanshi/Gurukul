<?php

namespace App\Models\Concerns;

trait Localizable
{
    /**
     * Resolve the localized value of a field for the given regional language,
     * falling back to the English (primary) value when no regional value exists
     * or the language is the primary language.
     *
     * Expects the model to have a `{field}_{lang}` column (e.g. `first_name_mr`).
     */
    public function localized(string $field, ?string $language = null): ?string
    {
        $language = $language ?: $this->resolveCurrentLanguage();
        $primaryLanguage = \App\Support\LanguageCatalog::PRIMARY_LANGUAGE;

        if ($language === $primaryLanguage) {
            return (string) ($this->{$field} ?? '');
        }

        $regionalColumn = $field.'_'.$language;
        $regionalValue = $this->{$regionalColumn} ?? null;

        $regionalValue = trim((string) ($regionalValue ?? ''));

        return $regionalValue !== '' ? $regionalValue : (string) ($this->{$field} ?? '');
    }

    /**
     * Determine the current request language from the middleware-resolved locale
     * (`?lang=` → cookie → regional), the UI cookie, or the organization's
     * configured regional language. Falls back to primary.
     */
    protected function resolveCurrentLanguage(): string
    {
        $resolved = request()->attributes->get('locale');

        if (is_string($resolved) && $resolved !== '' && \App\Support\LanguageCatalog::isValidCode($resolved)) {
            return $resolved;
        }

        $cookie = request()->cookie('locale');

        if (is_string($cookie) && \App\Support\LanguageCatalog::isValidCode($cookie)) {
            return $cookie;
        }

        return \App\Support\LanguageCatalog::PRIMARY_LANGUAGE;
    }
}
