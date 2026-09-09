<?php

namespace App\Support;

class LanguageCatalog
{
    public const ENGLISH = 'en';

    public const MARATHI = 'mr';

    public const HINDI = 'hi';

    public const PRIMARY_LANGUAGE = self::ENGLISH;

    /**
     * List of supported languages.
     *
     * @return array<string, string>  [code => native name]
     */
    public static function languages(): array
    {
        return [
            self::ENGLISH => 'English',
            self::MARATHI => 'मराठी (Marathi)',
            self::HINDI => 'हिन्दी (Hindi)',
        ];
    }

    public static function name(string $code): string
    {
        return self::languages()[$code] ?? $code;
    }

    public static function languageCodes(): array
    {
        return array_keys(self::languages());
    }

    public static function isValidCode(?string $code): bool
    {
        return $code !== null && array_key_exists($code, self::languages());
    }

    /**
     * Default language settings used when none have been configured yet.
     *
     * @return array<string, mixed>
     */
    public static function defaultLanguageSettings(): array
    {
        return [
            'dual_language_enabled' => false,
            'regional_language' => self::MARATHI,
            'universal_language_enabled' => false,
            'available_universal_languages' => [self::ENGLISH, self::MARATHI, self::HINDI],
        ];
    }

    /**
     * Normalize an arbitrary settings array to a fully-populated language settings array.
     *
     * @param  array<string, mixed>|null  $settings
     * @return array<string, mixed>
     */
    public static function normalize(?array $settings): array
    {
        $defaults = self::defaultLanguageSettings();

        $normalized = array_replace($defaults, is_array($settings) ? $settings : []);

        if (! self::isValidCode($normalized['regional_language'])) {
            $normalized['regional_language'] = self::MARATHI;
        }

        $available = array_values(array_filter(
            (array) ($normalized['available_universal_languages'] ?? []),
            fn ($code) => is_string($code) && self::isValidCode($code)
        ));

        if ($available === []) {
            $available = $defaults['available_universal_languages'];
        }

        if (! in_array(self::ENGLISH, $available, true)) {
            array_unshift($available, self::ENGLISH);
        }

        $normalized['available_universal_languages'] = array_values(array_unique($available));
        $normalized['dual_language_enabled'] = (bool) $normalized['dual_language_enabled'];
        $normalized['universal_language_enabled'] = (bool) $normalized['universal_language_enabled'];

        return $normalized;
    }
}
