<?php

namespace App\Services;

use App\Models\Organization;

final class AppearanceService
{
    public const FONT_SIZES = ['small', 'normal', 'large'];

    public const PANEL_FONTS = [
        'Instrument Sans',
        'Inter',
        'Poppins',
        'Playfair Display',
        'Noto Sans Devanagari',
        'Merriweather',
    ];

    public const PANEL_DENSITIES = ['compact', 'normal', 'comfortable'];

    private const DEFAULT_APPEARANCE = [
        'primary_color' => '#2563EB',
        'accent_color' => '#10B981',
        'font_size' => 'normal',
        'show_logo' => true,
        'show_grades' => true,
    ];

    private const DEFAULT_PANEL_APPEARANCE = [
        'primary_color' => '#2563EB',
        'accent_color' => '#10B981',
        'font_family' => 'Instrument Sans',
        'density' => 'normal',
        'show_logo' => true,
    ];

    private const BOOLEAN_FIELDS = ['show_logo', 'show_grades'];

    public function defaults(): array
    {
        return self::DEFAULT_APPEARANCE;
    }

    public function panelDefaults(): array
    {
        return self::DEFAULT_PANEL_APPEARANCE;
    }

    public function normalizeForOrganization(Organization $organization, string $settingsKey): array
    {
        $stored = is_array($organization->settings[$settingsKey] ?? null)
            ? $organization->settings[$settingsKey]
            : [];

        return $this->normalize($stored);
    }

    public function normalizePanelForOrganization(Organization $organization, string $settingsKey = 'panel_appearance'): array
    {
        $stored = is_array($organization->settings[$settingsKey] ?? null)
            ? $organization->settings[$settingsKey]
            : [];

        return $this->normalizePanel($stored);
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

    public function normalizePanel(array $stored = []): array
    {
        $appearance = [];

        foreach (self::DEFAULT_PANEL_APPEARANCE as $key => $default) {
            if ($key === 'show_logo') {
                $appearance[$key] = (bool) ($stored[$key] ?? $default);
            } else {
                $appearance[$key] = trim((string) ($stored[$key] ?? $default));
            }
        }

        if (! in_array($appearance['font_family'], self::PANEL_FONTS, true)) {
            $appearance['font_family'] = 'Instrument Sans';
        }

        if (! in_array($appearance['density'], self::PANEL_DENSITIES, true)) {
            $appearance['density'] = 'normal';
        }

        if (! preg_match('/^#[0-9a-fA-F]{6}$/', $appearance['primary_color'])) {
            $appearance['primary_color'] = self::DEFAULT_PANEL_APPEARANCE['primary_color'];
        }

        if (! preg_match('/^#[0-9a-fA-F]{6}$/', $appearance['accent_color'])) {
            $appearance['accent_color'] = self::DEFAULT_PANEL_APPEARANCE['accent_color'];
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

    public function panelRules(): array
    {
        return [
            'primary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'accent_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'font_family' => ['nullable', 'in:'.implode(',', self::PANEL_FONTS)],
            'density' => ['nullable', 'in:'.implode(',', self::PANEL_DENSITIES)],
            'show_logo' => ['nullable', 'boolean'],
        ];
    }

    public function panelCssVariables(array $appearance): array
    {
        $appearance = $this->normalizePanel($appearance);

        $density = match ($appearance['density']) {
            'compact' => ['font' => '14px', 'spacing' => '0.2rem'],
            'comfortable' => ['font' => '17px', 'spacing' => '0.3rem'],
            default => ['font' => '16px', 'spacing' => '0.25rem'],
        };

        return [
            '--primary' => $appearance['primary_color'],
            '--ring' => $appearance['primary_color'],
            '--sidebar-primary' => $appearance['primary_color'],
            '--sidebar-ring' => $appearance['primary_color'],
            '--accent' => $appearance['accent_color'],
            '--font-sans' => "'{$appearance['font_family']}', 'Noto Sans Devanagari', ui-sans-serif, system-ui, sans-serif",
            '--font-size' => $density['font'],
            '--spacing' => $density['spacing'],
        ];
    }
}