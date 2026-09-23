<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\User;
use App\Services\TemplateAssignmentService;
use App\Services\TemplateLibraryService;
use App\Support\FlowContentSanitizer;
use App\Support\TemplateCatalog;
use App\Support\TwinStandins;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Rich-text "Flow" editor for page-flow templates (multischoolerp-style
 * Customize Template). Flow designs store the printable page as raw HTML with
 * `{{token}}` placeholders — they are edited in a WYSIWYG/source editor rather
 * than the Fabric canvas, and their canonical payload is the `content` twin.
 */
class FlowEditorController extends Controller
{
    public function __construct(private readonly TemplateAssignmentService $templates)
    {
    }

    /**
     * Open the flow editor for a library or org-owned flow template. System
     * designs are copied on save (like the Canvas designer) so gallery
     * defaults are never mutated in place. With no template this is "start
     * fresh": a blank A4 flow design ready for a brand-new template.
     */
    public function edit(Request $request, ?CertificateTemplate $template = null): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if ($template) {
            if (! $template->isLibraryTemplate() && $template->organization_id !== $organization?->id) {
                abort(403);
            }

            abort_unless($this->isFlow($template), 404);
        }

        $category = $request->query('category');
        if ($category && ! in_array($category, TemplateCatalog::categoryKeys(), true)) {
            $category = null;
        }

        $presets = TemplateCatalog::cardSizePresets();
        $cardPreset = $request->query('card_size', 'a4_portrait');

        return Inertia::render('dashboard/FlowEditor', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'template' => $template ? $this->templates->serializeTemplate($template) : null,
            'categories' => TemplateCatalog::categories(),
            'selectedCategory' => $category,
            'cardSizePresets' => $presets,
            'cardWidthMm' => $template?->card_width_mm ?? ($presets[$cardPreset][0] ?? $presets['a4_portrait'][0]),
            'cardHeightMm' => $template?->card_height_mm ?? ($presets[$cardPreset][1] ?? $presets['a4_portrait'][1]),
            'placeholderGroups' => TemplateCatalog::placeholderGroups(),
            'standins' => TwinStandins::all(),
            'editorTypes' => TemplateCatalog::editorTypes(),
        ]);
    }

    /**
     * Persist the flow design (the `content` twin + size metadata) for an
     * org-owned template. `content_json` is cleared so the Fabric canvas falls
     * back to parsing the freshest twin if the flow template is ever opened
     * there — the twin is the single source of truth for flow designs. Without
     * a template this creates a brand-new org flow template (gallery "Flow
     * Editor" start-fresh flow).
     */
    public function save(Request $request, ?CertificateTemplate $template = null): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $copiedLibrary = false;

        if ($template) {
            abort_unless($this->isFlow($template), 404);

            if ($template->isLibraryTemplate()) {
                $template = app(TemplateLibraryService::class)->copyToOrg($organization, $template);
                $copiedLibrary = true;
            }

            if ($template->organization_id !== $organization->id) {
                abort(403);
            }
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(TemplateCatalog::categoryKeys())],
            'description' => ['nullable', 'string', 'max:2000'],
            'content' => ['required', 'string'],
            'type' => ['sometimes', Rule::in(['merit', 'achievement', 'participation', 'appreciation', 'completion'])],
            'card_width_mm' => ['nullable', 'numeric', 'min:20', 'max:600'],
            'card_height_mm' => ['nullable', 'numeric', 'min:20', 'max:600'],
            'card_size_preset' => ['nullable', 'string', 'max:40'],
            'thumbnail_data' => ['nullable', 'array'],
        ]);

        $widthMm = $validated['card_width_mm'] ?? null;
        $heightMm = $validated['card_height_mm'] ?? null;

        $values = [
            'title' => $validated['title'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?: null,
            'editor_type' => 'flow',
            'content' => FlowContentSanitizer::sanitize($validated['content']),
            'content_json' => null,
            'thumbnail_data' => $validated['thumbnail_data'] ?? $template?->thumbnail_data,
            'card_width_mm' => $widthMm,
            'card_height_mm' => $heightMm,
            'design_settings' => [
                'source' => 'flow-editor',
                'editor_type' => 'flow',
                'card_size_preset' => $validated['card_size_preset'] ?? ($template?->design_settings['card_size_preset'] ?? null),
                'card_width_mm' => $widthMm,
                'card_height_mm' => $heightMm,
            ],
            'status' => 'active',
        ];

        if ($template) {
            $template->update($values);

            return redirect()->route('template-gallery')->with(
                'success',
                $copiedLibrary ? 'Design copied to your templates and saved.' : 'Template updated successfully.'
            );
        }

        CertificateTemplate::query()->create([
            ...$values,
            'organization_id' => $organization->id,
            'type' => $validated['type'] ?? 'completion',
            'template_design' => 'template1',
            'is_system' => false,
        ]);

        return redirect()->route('template-gallery')->with('success', 'Template created successfully.');
    }

    /**
     * Duplicate an org-owned (or library) flow template and reopen the copy
     * in the flow editor. Mirrors CanvasDesignerController::duplicate.
     */
    public function duplicate(CertificateTemplate $template): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && ($template->organization_id === $organization->id || $template->isLibraryTemplate()), 403);
        abort_unless($this->isFlow($template), 404);

        $copy = $template->replicate();
        $copy->organization_id = $organization->id;
        $copy->title = ($template->localized('title') ?: 'Template').' (Copy)';
        $copy->is_system = false;
        $copy->save();

        return redirect()->route('flow-editor.edit', ['template' => $copy->id]);
    }

    private function isFlow(CertificateTemplate $template): bool
    {
        if ($template->editor_type === 'flow') {
            return true;
        }

        $content = (string) ($template->content ?? '');

        return $content !== '' && ! str_contains($content, 'cd-page');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }
}