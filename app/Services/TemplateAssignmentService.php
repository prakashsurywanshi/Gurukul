<?php

namespace App\Services;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\TemplateAssignment;
use App\Support\TemplateCatalog;

/**
 * Resolves the default template assigned to a printable slot for an
 * organization. When nothing is assigned, slots fall back to the system's
 * legacy behavior (settings JSON / hardcoded layouts).
 */
class TemplateAssignmentService
{
    /**
     * The assigned template model for a slot, or null when reset to defaults.
     */
    public function defaultFor(Organization $organization, string $slot): ?CertificateTemplate
    {
        if (! in_array($slot, TemplateCatalog::slotKeys(), true)) {
            return null;
        }

        $assignment = TemplateAssignment::query()
            ->where('organization_id', $organization->id)
            ->where('slot', $slot)
            ->first();

        if (! $assignment || ! $assignment->template_id) {
            return null;
        }

        return $assignment->template;
    }

    /**
     * The raw assignment row (used when the UI needs slot-level settings).
     */
    public function assignmentFor(Organization $organization, string $slot): ?TemplateAssignment
    {
        return TemplateAssignment::query()
            ->where('organization_id', $organization->id)
            ->where('slot', $slot)
            ->first();
    }

    /**
     * Assign a template to a slot. Passing null clears the assignment.
     */
    public function assign(Organization $organization, string $slot, ?int $templateId, array $settings = []): TemplateAssignment
    {
        if (! in_array($slot, TemplateCatalog::slotKeys(), true)) {
            throw new \InvalidArgumentException("Unknown template slot [{$slot}].");
        }

        $assignment = TemplateAssignment::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'slot' => $slot],
            []
        );

        $assignment->template_id = $templateId;
        $assignment->is_default = $templateId !== null;
        $assignment->settings = $settings ?: null;
        $assignment->save();

        return $assignment;
    }

    public function reset(Organization $organization, string $slot): bool
    {
        if (! in_array($slot, TemplateCatalog::slotKeys(), true)) {
            return false;
        }

        return (bool) TemplateAssignment::query()
            ->where('organization_id', $organization->id)
            ->where('slot', $slot)
            ->delete();
    }

    /**
     * @return array<int, array{key: string, label: string, category: string, renderer: string, module: string, description: string, template?: array<string, mixed>}>>
     */
    public function slotsPayload(Organization $organization): array
    {
        $assignments = TemplateAssignment::query()
            ->where('organization_id', $organization->id)
            ->with('template')
            ->get()
            ->keyBy('slot');

        return collect(TemplateCatalog::slots())
            ->map(function (array $slot) use ($assignments) {
                $template = $assignments->get($slot['key'])?->template;

                return $slot + [
                    'template' => $template ? $this->serializeTemplateCard($template) : null,
                ];
            })
            ->all();
    }

    /**
     * Flat serialization shared by gallery, designer and assignment pages.
     *
     * @return array<string, mixed>
     */
    public function serializeTemplate(CertificateTemplate $template): array
    {
        return [
            'id' => (string) $template->id,
            'title' => $template->localized('title'),
            'type' => $template->type,
            'category' => $template->category,
            'categoryLabel' => $template->category ? $this->categoryLabel($template->category) : null,
            'editorType' => $template->editor_type ?? 'legacy',
            'description' => $template->localized('description'),
            'design' => $template->design_settings,
            'content' => $template->content,
            'contentJson' => $template->content_json,
            'backContent' => $template->back_content,
            'backContentJson' => $template->back_content_json,
            'thumbnailData' => $template->thumbnail_data,
            'cardWidthMm' => $template->card_width_mm,
            'cardHeightMm' => $template->card_height_mm,
            'isSystem' => $template->isLibraryTemplate(),
            'status' => $template->status,
            'createdAt' => optional($template->created_at)->format('Y-m-d'),
        ];
    }

    private function categoryLabel(string $key): ?string
    {
        foreach (TemplateCatalog::categories() as $category) {
            if (($category['key'] ?? null) === $key) {
                return $category['label'];
            }
        }

        return null;
    }

    /**
     * Lightweight serialization for template lists/grids (gallery pickers).
     * Intentionally omits the `content` twins and JSON payloads — the Default
     * Templates "Choose from gallery" popup renders every library + school
     * template in one response, and shipping each full design twin would make
     * the page several megabytes and slow to render.
     *
     * @return array<string, mixed>
     */
    public function serializeTemplateCard(CertificateTemplate $template): array
    {
        return [
            'id' => (string) $template->id,
            'title' => $template->localized('title'),
            'type' => $template->type,
            'category' => $template->category,
            'categoryLabel' => $template->category ? $this->categoryLabel($template->category) : null,
            'editorType' => $template->editor_type ?? 'legacy',
            'thumbnailData' => $template->thumbnail_data,
            'cardWidthMm' => $template->card_width_mm,
            'cardHeightMm' => $template->card_height_mm,
            'isSystem' => $template->isLibraryTemplate(),
        ];
    }
}