<?php

namespace App\Services;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\TemplateAssignment;
use Illuminate\Support\Str;

/**
 * Manages the system (library) template rows and per-organization provisioning:
 * publishing seed assets, copying a library design into an organization, and
 * ensuring every printable slot has a sensible default assignment.
 */
class TemplateLibraryService
{
    /**
     * Insert (or update) system library rows from the seed asset list.
     *
     * @param array<int, array<string, mixed>> $items
     *
     * @return int number of library rows written
     */
    public function publish(array $items): int
    {
        $written = 0;

        foreach ($items as $item) {
            $slug = Str::slug($item['title'] ?? 'untitled');

            $values = array_merge($this->defaultColumns(), $item);
            $values['editor_type'] = $this->inferEditorType($values);
            $this->foldCardSizePreset($values);

            CertificateTemplate::query()->updateOrCreate(
                [
                    'organization_id' => null,
                    'title' => $item['title'],
                    'category' => $item['category'] ?? 'general',
                ],
                $values
            );

            $written++;
        }

        return $written;
    }

    /**
     * A design whose printable twin is raw page HTML (no `cd-page` canvas
     * marker) is a rich-text "flow" template and is edited with the Flow
     * editor. Library assets advertising `legacy` stay untouched; everything
     * else with a non-canvas twin is classified `flow`.
     */
    private function inferEditorType(array $values): string
    {
        $declared = $values['editor_type'] ?? null;
        if ($declared === 'legacy') {
            return 'legacy';
        }

        $content = (string) ($values['content'] ?? '');
        if ($content !== '' && ! str_contains($content, 'cd-page')) {
            return 'flow';
        }

        return in_array((string) $declared, ['legacy', 'flow'], true) ? (string) $declared : 'fabric';
    }

    /**
     * Seed assets advertise the chosen physical-size preset as a top-level
     * `card_size_preset` key, but the rows store it inside the fillable
     * `design_settings` JSON column. Fold it over so the seeder never tries to
     * write an unknown column.
     */
    private function foldCardSizePreset(array &$values): void
    {
        $preset = $values['card_size_preset'] ?? null;
        unset($values['card_size_preset']);

        if ($preset === null) {
            return;
        }

        $settings = $values['design_settings'] ?? null;
        $values['design_settings'] = array_merge(
            is_array($settings) ? $settings : [],
            ['card_size_preset' => $preset]
        );
    }

    /**
     * Copy a library or own design into the organization. Returns the new row.
     */
    public function copyToOrg(Organization $organization, CertificateTemplate $template, ?string $title = null): CertificateTemplate
    {
        $copy = $template->replicate();
        $copy->organization_id = $organization->id;
        $copy->title = $title ?: $template->localized('title');
        $copy->is_system = false;
        $copy->save();

        return $copy;
    }

    /**
     * Ensure every slot has a default assignment. Each slot's category may
     * advertise a preferred default row (design_settings.preferred_default);
     * when present that row is assigned, otherwise the first library row of
     * the category (ordered by title) is used — the previous behaviour.
     *
     * A slot that already holds an organization-owned template (a library copy
     * or a user design) is left untouched, and an existing assignment to the
     * preferred default is never rewritten. Only the automatically provisioned
     * *system* default is swapped so the advertised default always wins.
     */
    public function provisionDefaults(Organization $organization): void
    {
        $service = app(TemplateAssignmentService::class);

        foreach ($service->slotsPayload($organization) as $slot) {
            $preferred = $this->preferredForCategory($slot['category']);
            if (! $preferred) {
                continue;
            }

            $current = TemplateAssignment::query()
                ->where('organization_id', $organization->id)
                ->where('slot', $slot['key'])
                ->with('template')
                ->first();

            if ($current) {
                $currentTemplate = $current->template;
                $samePreferred = $currentTemplate && (int) $currentTemplate->id === (int) $preferred->id;
                $orgOwned = $currentTemplate && $currentTemplate->organization_id !== null;

                if ($samePreferred || $orgOwned) {
                    continue;
                }
            }

            $service->assign($organization, $slot['key'], $preferred->id);
        }
    }

    /**
     * The library row a slot's category prefers as its default, falling back
     * to the first row of the category (ordered by title).
     */
    private function preferredForCategory(string $category): ?CertificateTemplate
    {
        $preferred = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('category', $category)
            ->where('design_settings->preferred_default', true)
            ->first();

        if ($preferred) {
            return $preferred;
        }

        return CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('category', $category)
            ->orderBy('title')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultColumns(): array
    {
        return [
            'type' => 'completion',
            'editor_type' => 'fabric',
            'template_design' => 'template1',
            'design_settings' => null,
            'status' => 'active',
            'content' => null,
            'content_json' => null,
            'back_content' => null,
            'back_content_json' => null,
            'thumbnail_data' => null,
            'card_width_mm' => null,
            'card_height_mm' => null,
            'is_system' => true,
        ];
    }
}