<?php

namespace App\Services;

use App\Models\Organization;

final class AppearanceService
{
    public const FONT_SIZES = ['small', 'normal', 'large'];

    private const DEFAULT_APPEARANCE = [
        'primary_color' => '#2563EB',
        'accent_color' => '#10B981',
        'font_size' => 'normal',
        'show_logo' => true,
        'show_grades' => true,
    ];

    private const BOOLEAN_FIELDS = ['show_logo', 'show_grades'];

    public function defaults(): array
    {
        return self::DEFAULT_APPEARANCE;
    }

    public function normalizeForOrganization(Organization $organization, string $settingsKey): array
    {
        $stored = is_array($organization->settings[$settingsKey] ?? null)
            ? $organization->settings[$settingsKey]
            : [];

        return $this->normalize($stored);
    }

    public function normalize(array $stored = []): array
    {
        $appearance = [];

        foreach (self::DEFAULT_APPEARANCE as $key => $default) {
            if (in_array($key, self::BOOLEAN_FIELDS, true)) {
                $appearance[$key] = (bool) ($stored[$key] ?? $default);
            } else {
                $appearance[$key] = trim((string) ($stored[$key] ?? $default));
            }
        }

        if (! in_array($appearance['font_size'], self::FONT_SIZES, true)) {
            $appearance['font_size'] = 'normal';
        }

        return $appearance;
    }

    public function rules(): array
    {
        return [
            'primary_color' => ['nullable', 'string', 'max:20'],
            'accent_color' => ['nullable', 'string', 'max:20'],
            'font_size' => ['nullable', 'in:'.implode(',', self::FONT_SIZES)],
            'show_logo' => ['nullable', 'boolean'],
            'show_grades' => ['nullable', 'boolean'],
        ];
    }
}