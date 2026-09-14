<?php

namespace App\Http\Controllers;

use App\Models\ApprovalFlow;
use App\Models\ApprovalFlowStep;
use App\Models\Organization;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use App\Services\Approvals\ApprovalModuleRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalFlowController extends Controller
{
    public function __construct(
        private readonly ApprovalModuleRegistry $registry,
    ) {
    }

    public function index(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $flows = ApprovalFlow::query()
            ->where('organization_id', $organization->id)
            ->with(['steps'])
            ->get()
            ->keyBy('module');

        $modules = collect($this->registry->all())
            ->map(function ($handler) use ($flows, $organization) {
                $module = $handler::module();
                $flow = $flows->get($module);

                return [
                    'module' => $module,
                    'label' => $handler->label(),
                    'name' => $flow?->name ?? $handler->label(),
                    'description' => $flow?->description,
                    'isActive' => $flow ? (bool) $flow->is_active : true,
                    'hasFlow' => (bool) $flow,
                    'flowId' => $flow?->id,
                    'steps' => $flow
                        ? $flow->steps->map(fn (ApprovalFlowStep $step) => $this->serializeStep($step))->values()->all()
                        : [],
                    'actorOptions' => $this->actorOptions($organization),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('dashboard/ApprovalFlows', [
            'user' => $user,
            'flows' => $modules,
            'staffUsers' => $this->staffRecords($organization),
            'roleOptions' => collect(['admin', ...RolePermissionCatalog::staffRoleSlugs()])
                ->unique()
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'module' => ['required', 'string'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $this->registry->assertModule($validated['module']);

        ApprovalFlow::query()->updateOrCreate(
            [
                'organization_id' => $organization->id,
                'module' => $validated['module'],
            ],
            [
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => (bool) ($validated['is_active'] ?? true),
            ]
        );

        return back()->with('success', 'Approval flow updated.');
    }

    public function storeSteps(Request $request, ApprovalFlow $approvalFlow): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $approvalFlow->organization_id === $organization->id, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'steps' => ['required', 'array'],
            'steps.*.actor_type' => ['required', Rule::in(['role', 'user'])],
            'steps.*.actor_value' => ['required', 'string'],
            'steps.*.note' => ['nullable', 'string', 'max:255'],
        ]);

        if (count($validated['steps']) === 0) {
            return back()->with('error', 'At least one approval step is required.');
        }

        $approvalFlow->steps()->delete();

        foreach (array_values($validated['steps']) as $index => $step) {
            ApprovalFlowStep::query()->create([
                'approval_flow_id' => $approvalFlow->id,
                'step_no' => $index + 1,
                'actor_type' => $step['actor_type'],
                'actor_value' => $step['actor_value'],
                'note' => $step['note'] ?? null,
            ]);
        }

        return back()->with('success', 'Approval chain steps saved.');
    }

    public function toggle(Request $request, ApprovalFlow $approvalFlow): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $approvalFlow->organization_id === $organization->id, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $approvalFlow->update(['is_active' => (bool) $validated['is_active']]);

        return back()->with('success', 'Approval flow '.(filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN) ? 'enabled' : 'disabled').'.');
    }

    private function serializeStep(ApprovalFlowStep $step): array
    {
        return [
            'stepNo' => $step->step_no,
            'actorType' => $step->actor_type,
            'actorValue' => $step->actor_value,
            'note' => $step->note,
        ];
    }

    private function actorOptions(Organization $organization): array
    {
        return [
            'roles' => collect(['admin', ...RolePermissionCatalog::staffRoleSlugs()])->unique()->values()->all(),
            'users' => $this->staffRecords($organization),
        ];
    }

    private function staffRecords(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('role')
            ->where('role', '!=', 'student')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ])
            ->values()
            ->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id ? Organization::query()->find($user->organization_id) : Organization::query()->first();
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }
}