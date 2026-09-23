<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\User;
use App\Services\TemplateAssignmentService;
use App\Services\TemplateLibraryService;
use App\Support\TemplateCatalog;
use App\Support\TwinNoteSanitizer;
use App\Support\TwinStandins;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CanvasDesignerController extends Controller
{
    public function __construct(private readonly TemplateAssignmentService $templates)
    {
    }

    /**
     * Open the Fabric.js design workspace for a new design or an existing
     * template (library or org-owned).
     */
    public function edit(Request $request, ?CertificateTemplate $template = null): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if ($template && ! $template->isLibraryTemplate() && $template->organization_id !== $organization?->id) {
            abort(403);
        }

        $category = $request->query('category');
        if ($category && ! in_array($category, TemplateCatalog::categoryKeys(), true)) {
            $category = null;
        }

        $cardPreset = $request->query('card_size', 'cr80_portrait');
        $presets = TemplateCatalog::cardSizePresets();
        [$cardW, $cardH] = $presets[$cardPreset] ?? $presets['cr80_portrait'];

        return Inertia::render('dashboard/CanvasDesigner', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'template' => $template ? $this->templates->serializeTemplate($template) : null,
            'categories' => TemplateCatalog::categories(),
            'cardSizePresets' => $presets,
            'cardWidthMm' => $template?->card_width_mm ?? $cardW,
            'cardHeightMm' => $template?->card_height_mm ?? $cardH,
            'placeholderGroups' => TemplateCatalog::placeholderGroups(),
            'standins' => TwinStandins::all(),
            'samples' => [
                'photo' => TwinStandins::svgDataUri(TwinStandins::avatarSvg('#e2e8f0')),
                'logo' => TwinStandins::svgDataUri(TwinStandins::logoSvg()),
            ],
            'editorTypes' => TemplateCatalog::editorTypes(),
        ]);
    }

    /**
     * Persist a Fabric.js design (create or update an org-owned template).
     */
    public function save(Request $request, ?CertificateTemplate $template = null): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        // Editing/`Save` on a shared library design is converted into an
        // organization-owned copy the school can actually modify — the system
        // defaults are never mutated in place.
        $copiedLibrary = false;
        if ($template && $template->isLibraryTemplate()) {
            $template = app(TemplateLibraryService::class)->copyToOrg($organization, $template);
            $copiedLibrary = true;
        }

        if ($template && $template->organization_id !== $organization->id) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(TemplateCatalog::categoryKeys())],
            'editor_type' => ['required', Rule::in(TemplateCatalog::editorTypes())],
            'type' => ['required', Rule::in(['merit', 'achievement', 'participation', 'appreciation', 'completion'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'content' => ['nullable', 'string'],
            'content_json' => ['nullable', 'array'],
            'back_content' => ['nullable', 'string'],
            'back_content_json' => ['nullable', 'array'],
            'thumbnail_data' => ['nullable', 'array'],
            'card_width_mm' => ['required', 'numeric', 'min:20', 'max:600'],
            'card_height_mm' => ['required', 'numeric', 'min:20', 'max:600'],
        ]);

        // Re-apply the note-card rich-text allowlist server side (defence in
        // depth; the designer already sanitises before submitting).
        $cleanTwin = static fn (?string $value): ?string => $value === null ? null : TwinNoteSanitizer::sanitizeTwin((string) $value);
        $cleanJson = static fn (?array $value): ?array => $value === null ? null : TwinNoteSanitizer::sanitizeJson($value);
        $values = [
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'category' => $validated['category'],
            'editor_type' => $validated['editor_type'],
            'description' => $validated['description'] ?: null,
            'content' => $cleanTwin($validated['content'] ?? null),
            'content_json' => $cleanJson($validated['content_json'] ?? null),
            'back_content' => $cleanTwin($validated['back_content'] ?? null),
            'back_content_json' => $cleanJson($validated['back_content_json'] ?? null),
            'thumbnail_data' => $validated['thumbnail_data'] ?? null,
            'card_width_mm' => $validated['card_width_mm'],
            'card_height_mm' => $validated['card_height_mm'],
            'template_design' => 'template1',
            'design_settings' => [
                'preset' => 'blue',
                'source' => 'canvas-designer',
                'editor_type' => $validated['editor_type'],
                'card_width_mm' => $validated['card_width_mm'],
                'card_height_mm' => $validated['card_height_mm'],
            ],
            'status' => 'active',
            'is_system' => false,
        ];

        if ($template) {
            $template->update($values);

            return redirect()->route('template-gallery')->with(
                'success',
                $copiedLibrary ? 'Design copied to your templates and saved.' : 'Template updated successfully.'
            );
        }

        CertificateTemplate::query()->create($values);

        return redirect()->route('template-gallery')->with('success', 'Template created successfully.');
    }

    /**
     * Duplicate an existing org template.
     */
    public function duplicate(CertificateTemplate $template): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && ($template->organization_id === $organization->id || $template->isLibraryTemplate()), 403);

        $copy = $template->replicate();
        $copy->organization_id = $organization->id;
        $copy->title = ($template->localized('title') ?: 'Template').' (Copy)';
        $copy->is_system = false;
        $copy->save();

        return redirect()->route('canvas-designer.edit', ['template' => $copy->id]);
    }

    public function destroy(CertificateTemplate $template): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $template->organization_id === $organization->id && ! $template->isLibraryTemplate(), 403);

        $template->delete();

        return redirect()->route('template-gallery')->with('success', 'Template deleted successfully.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }
}