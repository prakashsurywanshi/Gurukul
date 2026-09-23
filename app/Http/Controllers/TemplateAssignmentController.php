<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\User;
use App\Services\TemplateAssignmentService;
use App\Support\TemplateCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TemplateAssignmentController extends Controller
{
    public function __construct(private readonly TemplateAssignmentService $templates)
    {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $ownTemplates = CertificateTemplate::query()
            ->ownedBy($organization->id)
            ->where('status', 'active')
            ->orderBy('title')
            ->get()
            ->map(fn (CertificateTemplate $template) => $this->templates->serializeTemplateCard($template))
            ->all();

        $libraryTemplates = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('status', 'active')
            ->orderBy('title')
            ->get()
            ->map(fn (CertificateTemplate $template) => $this->templates->serializeTemplateCard($template))
            ->all();

        return Inertia::render('dashboard/DefaultTemplates', [
            'user' => $user,
            'schoolName' => $organization->name,
            'slots' => $this->templates->slotsPayload($organization),
            'ownTemplates' => $ownTemplates,
            'libraryTemplates' => $libraryTemplates,
            'categories' => TemplateCatalog::categories(),
        ]);
    }

    public function assign(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'slot' => ['required', Rule::in(TemplateCatalog::slotKeys())],
            'template_id' => ['required', 'integer', 'exists:certificate_templates,id'],
        ]);

        $template = CertificateTemplate::query()->findOrFail($validated['template_id']);

        if (! $template->isLibraryTemplate() && $template->organization_id !== $organization->id) {
            abort(403);
        }

        $this->templates->assign($organization, $validated['slot'], $template->id, $request->input('settings', []));

        return back()->with('success', 'Default template assigned.');
    }

    public function reset(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'slot' => ['required', Rule::in(TemplateCatalog::slotKeys())],
        ]);

        $this->templates->reset($organization, $validated['slot']);

        return back()->with('success', 'Reset to system default.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }
}