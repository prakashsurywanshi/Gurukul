<?php

namespace App\Services;

use App\Models\Organization;

class GradingScaleService
{
    public const SETTINGS_KEY = 'grading_scale';

    public static function defaultScale(): array
    {
        return [
            ['grade' => 'A+', 'min' => 90, 'max' => 100, 'point' => 4.0, 'remark' => 'Outstanding'],
            ['grade' => 'A', 'min' => 80, 'max' => 89, 'point' => 3.7, 'remark' => 'Excellent'],
            ['grade' => 'B+', 'min' => 70, 'max' => 79, 'point' => 3.3, 'remark' => 'Very Good'],
            ['grade' => 'B', 'min' => 60, 'max' => 69, 'point' => 3.0, 'remark' => 'Good'],
            ['grade' => 'C+', 'min' => 50, 'max' => 59, 'point' => 2.5, 'remark' => 'Above Average'],
            ['grade' => 'C', 'min' => 40, 'max' => 49, 'point' => 2.0, 'remark' => 'Average'],
            ['grade' => 'F', 'min' => 0, 'max' => 39, 'point' => 0.0, 'remark' => 'Needs Improvement'],
        ];
    }

    public static function effectiveScale(?Organization $organization): array
    {
        $configured = $organization?->settings[self::SETTINGS_KEY] ?? null;

        if (is_array($configured) && count($configured) > 0 && self::isValidScale($configured)) {
            return self::normalize($configured);
        }

        return self::normalize(self::defaultScale());
    }

    public static function saveScale(Organization $organization, array $rows): void
    {
        $settings = $organization->settings ?? [];
        $settings[self::SETTINGS_KEY] = self::normalize($rows);

        $organization->settings = $settings;
        $organization->save();
    }

    public static function gradeFor(float $percentage, ?Organization $organization): ?array
    {
        $scale = self::effectiveScale($organization);

        foreach ($scale as $row) {
            if ($percentage >= $row['min'] && $percentage <= $row['max']) {
                return $row;
            }
        }

        return null;
    }

    private static function normalize(array $rows): array
    {
        return collect($rows)
            ->map(fn ($row) => [
                'grade' => is_array($row) ? trim((string) ($row['grade'] ?? '')) : '',
                'min' => (float) (is_array($row) ? ($row['min'] ?? 0) : 0),
                'max' => (float) (is_array($row) ? ($row['max'] ?? 0) : 0),
                'point' => (float) (is_array($row) ? ($row['point'] ?? 0) : 0),
                'remark' => is_array($row) ? trim((string) ($row['remark'] ?? '')) : '',
            ])
            ->filter(fn ($row) => $row['grade'] !== '')
            ->sortByDesc('min')
            ->values()
            ->all();
    }

    private static function isValidScale(array $rows): bool
    {
        return collect($rows)->every(function ($row) {
            return is_array($row)
                && isset($row['grade'], $row['min'], $row['max'])
                && is_string($row['grade'])
                && $row['grade'] !== ''
                && is_numeric($row['min'])
                && is_numeric($row['max']);
        });
    }
}