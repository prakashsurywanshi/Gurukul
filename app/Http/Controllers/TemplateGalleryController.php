<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\User;
use App\Services\TemplateAssignmentService;
use App\Services\TemplateLibraryService;
use App\Support\TemplateCatalog;
use App\Support\TwinStandins;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class TemplateGalleryController extends Controller
{
    public function __construct(
        private readonly TemplateAssignmentService $templates,
        private readonly TemplateLibraryService $library,
    ) {
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $category = $request->query('category');
        $search = trim((string) $request->query('search'));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = 10;

        $query = CertificateTemplate::query()
            ->visibleTo($organization?->id ?? 0, $organization === null)
            ->where('status', 'active');

        if ($category && in_array($category, TemplateCatalog::categoryKeys(), true)) {
            $query->where('category', $category);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $pager = $query->orderBy('is_system', 'desc')->orderBy('title')->paginate($perPage, ['*'], 'page', $page);

        $templates = collect($pager->items())
            ->map(fn (CertificateTemplate $template) => $this->templates->serializeTemplate($template))
            ->all();

        $counts = $this->categoryCounts($organization);

        return Inertia::render('dashboard/TemplateGallery', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'categories' => array_map(
                static fn (array $category) => ['key' => $category['key'], 'label' => $category['label'], 'count' => $counts[$category['key']] ?? 0],
                TemplateCatalog::categories()
            ),
            'templates' => $templates,
            'pagination' => [
                'page' => $pager->currentPage(),
                'perPage' => $perPage,
                'total' => $pager->total(),
                'lastPage' => $pager->lastPage(),
            ],
            'filters' => [
                'category' => $category,
                'search' => $search,
            ],
            'placeholderGroups' => TemplateCatalog::placeholderGroups(),
            'cardSizePresets' => TemplateCatalog::cardSizePresets(),
            'standins' => TwinStandins::all(),
        ]);
    }

    /**
     * Copy a library (or any visible) template into the organization.
     */
    public function use(Request $request, CertificateTemplate $template): \Illuminate\Http\RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        if (! $template->isLibraryTemplate() && $template->organization_id !== $organization->id) {
            abort(403);
        }

        $copy = $this->library->copyToOrg($organization, $template);

        $mode = $request->query('mode');

        // Flow templates open straight into the rich-text Customize editor
        // (multischoolerp parity); fabric designs go to the Canvas Designer.
        $isFlow = $copy->editor_type === 'flow'
            || ((string) $copy->content !== '' && ! str_contains((string) $copy->content, 'cd-page'));

        if ($isFlow) {
            return redirect()->route('flow-editor.edit', ['template' => $copy->id]);
        }

        return $mode === 'designer'
            ? redirect()->route('canvas-designer.edit', ['template' => $copy->id])
            : redirect()->route('template-gallery')->with('success', 'Template added to your school.');
    }

    /**
     * @return array<string, int>
     */
    private function categoryCounts(?Organization $organization): array
    {
        $rows = CertificateTemplate::query()
            ->visibleTo($organization?->id ?? 0, $organization === null)
            ->where('status', 'active')
            ->selectRaw('category, count(*) as total')
            ->groupBy('category')
            ->pluck('total', 'category')
            ->all();

        $counts = [];
        foreach (TemplateCatalog::categoryKeys() as $key) {
            $counts[$key] = (int) ($rows[$key] ?? 0);
        }

        return $counts;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }
}