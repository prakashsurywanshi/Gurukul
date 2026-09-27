<?php

namespace App\Services;

use App\Models\Organization;
use App\Support\PortalPresets;

class PortalReadinessService
{
    public function __construct(private readonly PortalRecordBuilder $builder)
    {
    }

    public function forState(Organization $organization, ?string $state = null): array
    {
        $state = $state ?: $this->stateFor($organization);

        $presets = collect(PortalPresets::presetsForState($state))
            ->map(function (array $preset) use ($organization, $state) {
                $readiness = $this->readiness($organization, $preset['key']);

                return [
                    'key' => $preset['key'],
                    'label' => $preset['label'],
                    'description' => $preset['description'],
                    'state' => $state,
                    'sheets' => $readiness['sheets'],
                ];
            })
            ->values()
            ->all();

        $custom = $this->customTemplates($organization);

        return [
            'presets' => $presets,
            'customTemplates' => $custom,
        ];
    }

    public function readiness(Organization $organization, string $presetKey, ?array $customPreset = null): array
    {
        $sheets = $this->builder->sheets($organization, $presetKey, $customPreset);
        $report = [];

        foreach ($sheets as $sheet) {
            $rows = $sheet['rows'];
            $entityCount = count($rows);

            $columns = array_map(function (array $column) use ($rows, $entityCount) {
                $filled = collect($rows)->filter(fn (array $row) => trim((string) ($row[$column['label']] ?? '')) !== '')->count();

                return [
                    'label' => $column['label'],
                    'required' => (bool) $column['required'],
                    'filled' => $filled,
                    'coverage' => $entityCount > 0 ? (int) round(($filled / $entityCount) * 100) : 0,
                ];
            }, $sheet['columns']);

            $requiredColumns = array_filter($columns, fn (array $column) => $column['required']);

            $readyCount = collect($rows)->filter(function (array $row) use ($sheet) {
                foreach ($sheet['columns'] as $column) {
                    if (($column['required'] ?? false) && trim((string) ($row[$column['label']] ?? '')) === '') {
                        return false;
                    }
                }

                return true;
            })->count();

            $attentionNames = collect($rows)
                ->filter(function (array $row) use ($sheet) {
                    foreach ($sheet['columns'] as $column) {
                        if (($column['required'] ?? false) && trim((string) ($row[$column['label']] ?? '')) === '') {
                            return true;
                        }
                    }

                    return false;
                })
                ->take(5)
                ->map(function (array $row) use ($sheet) {
                    $nameColumns = array_filter($sheet['columns'], fn (array $column) => in_array($column['source'], [$sheet['entity'].'.name_full', $sheet['entity'].'.name_caps'], true));

                    $nameColumn = $nameColumns ? reset($nameColumns)['label'] : ($sheet['columns'][0]['label'] ?? null);

                    return $nameColumn ? (string) ($row[$nameColumn] ?? '') : '';
                })
                ->filter()
                ->values()
                ->all();

            $requiredCoverage = empty($requiredColumns)
                ? ($entityCount > 0 ? 100 : 0)
                : (int) round(array_sum(array_column($requiredColumns, 'coverage')) / count($requiredColumns));

            $report[] = [
                'name' => $sheet['name'],
                'entity' => $sheet['entity'],
                'entityCount' => $entityCount,
                'readyCount' => $readyCount,
                'rowsNeedingAttention' => max($entityCount - $readyCount, 0),
                'attentionNames' => $attentionNames,
                'requiredCoverage' => $requiredCoverage,
                'columns' => $columns,
            ];
        }

        return ['sheets' => $report];
    }

    public function customTemplates(Organization $organization): array
    {
        $settings = is_array($organization->settings['portal_records'] ?? null)
            ? $organization->settings['portal_records']
            : [];
        $templates = is_array($settings['custom_templates'] ?? null)
            ? $settings['custom_templates']
            : [];

        return collect($templates)->map(function (array $template, int $index) {
            $template['id'] = (string) $index;

            return $template;
        })->values()->all();
    }

    public function customTemplateById(Organization $organization, string $id): ?array
    {
        return collect($this->customTemplates($organization))
            ->first(fn (array $template) => (string) $template['id'] === (string) $id);
    }

    public function stateFor(Organization $organization): string
    {
        $settings = is_array($organization->settings['portal_records'] ?? null)
            ? $organization->settings['portal_records']
            : [];

        return $settings['state'] ?? 'maharashtra';
    }

    public function updateState(Organization $organization, string $state): void
    {
        if (! array_key_exists($state, PortalPresets::states())) {
            throw new \InvalidArgumentException("Unsupported state: {$state}");
        }

        $this->updateSettings($organization, ['state' => $state]);
    }

    public function saveTemplate(Organization $organization, array $template, ?string $id = null): void
    {
        $templates = collect($this->customTemplates($organization))
            ->map(fn (array $item) => collect($item)->forget('id')->all())
            ->values()
            ->all();

        if ($id !== null) {
            foreach ($templates as $index => $existing) {
                if ((string) $index === (string) $id) {
                    $templates[$index] = $template;

                    $this->updateSettings($organization, ['custom_templates' => $templates]);

                    return;
                }
            }

            throw new \InvalidArgumentException('Template not found.');
        }

        $templates[] = $template;

        $this->updateSettings($organization, ['custom_templates' => $templates]);
    }

    public function deleteTemplate(Organization $organization, string $id): void
    {
        $templates = collect($this->customTemplates($organization))
            ->filter(fn (array $template) => (string) $template['id'] !== (string) $id)
            ->map(fn (array $item) => collect($item)->forget('id')->all())
            ->values()
            ->all();

        $this->updateSettings($organization, ['custom_templates' => $templates]);
    }

    public function ensureDefaults(Organization $organization): array
    {
        $settings = is_array($organization->settings['portal_records'] ?? null)
            ? $organization->settings['portal_records']
            : [];

        $settings['state'] = $settings['state'] ?? 'maharashtra';
        $settings['custom_templates'] = $settings['custom_templates'] ?? [];

        if (! isset($organization->settings['portal_records']) || $organization->settings['portal_records'] !== $settings) {
            $this->updateSettings($organization, $settings);
        }

        return $settings;
    }

    private function updateSettings(Organization $organization, array $values): void
    {
        $settings = is_array($organization->settings['portal_records'] ?? null)
            ? $organization->settings['portal_records']
            : [];

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'portal_records' => array_merge($settings, $values),
            ],
        ]);
    }
}