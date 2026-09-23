<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\IdCardDesignService;
use App\Services\TemplateAssignmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CardDesignController extends Controller
{
    public function __construct(private readonly IdCardDesignService $designService)
    {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $assignments = app(TemplateAssignmentService::class);

        return Inertia::render('dashboard/CardDesigns', [
            'user' => $user,
            'design' => $this->designService->normalizeForOrganization($organization),
            'assignedTemplate' => $assignments->serializeAssignedTemplate(
                $assignments->defaultFor($organization, 'student-id-card')
            ),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $request->validate($this->designService->rules());

        $design = $this->designService->normalize($validated);

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'id_card_design' => $design,
            ],
        ]);

        return redirect()->route('card-designs')->with('success', 'ID card design saved.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}