<?php

namespace App\Services;

use App\Models\Organization;

final class IdCardDesignService
{
    public const LAYOUTS = ['landscape', 'portrait'];

    public const DESIGN_SETTING_KEYS = [
        'student' => 'id_card_design',
        'staff' => 'staff_id_card_design',
    ];

    private const DEFAULT_DESIGN = [
        'layout' => 'landscape',
        'primary_color' => '#1d4ed8',
        'show_photo' => true,
        'show_admission_no' => true,
        'show_qr' => true,
        'show_guardian' => true,
        'show_blood_group' => false,
        'show_dob' => true,
    ];

    private const BOOLEAN_FIELDS = [
        'show_photo',
        'show_admission_no',
        'show_qr',
        'show_guardian',
        'show_blood_group',
        'show_dob',
    ];

    public function defaults(): array
    {
        return self::DEFAULT_DESIGN;
    }

    public function normalizeForOrganization(Organization $organization, string $type = 'student'): array
    {
        $key = self::DESIGN_SETTING_KEYS[$type] ?? self::DESIGN_SETTING_KEYS['student'];

        $stored = is_array($organization->settings[$key] ?? null)
            ? $organization->settings[$key]
            : [];

        return $this->normalize($stored);
    }

    public function normalize(array $stored = []): array
    {
        $design = [];

        foreach (self::DEFAULT_DESIGN as $key => $default) {
            if (in_array($key, self::BOOLEAN_FIELDS, true)) {
                $design[$key] = (bool) ($stored[$key] ?? $default);
            } else {
                $design[$key] = trim((string) ($stored[$key] ?? $default));
            }
        }

        if (! in_array($design['layout'], self::LAYOUTS, true)) {
            $design['layout'] = 'landscape';
        }

        return $design;
    }

    public function rules(): array
    {
        return [
            'layout' => ['nullable', 'string', 'max:60'],
            'primary_color' => ['nullable', 'string', 'max:60'],
            ...array_map(
                fn (string $field) => ['nullable', 'boolean'],
                array_combine(self::BOOLEAN_FIELDS, self::BOOLEAN_FIELDS)
            ),
        ];
    }
}