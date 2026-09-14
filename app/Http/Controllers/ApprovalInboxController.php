<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use App\Models\ApprovalRequestStep;
use App\Models\Organization;
use App\Models\User;
use App\Services\Approvals\ApprovalEngine;
use App\Services\Approvals\ApprovalModuleRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalInboxController extends Controller
{
    public function __construct(
        private readonly ApprovalEngine $engine,
        private readonly ApprovalModuleRegistry $registry,
    ) {
    }

    public function actionCenter(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $requests = $this->engine->actionableFor($user, $organization);

        return Inertia::render('dashboard/ApprovalActionCenter', [
            'user' => $user,
            'requests' => $requests->map(fn (ApprovalRequest $request) => $this->serialize($request, $user))->values()->all(),
        ]);
    }

    public function submitted(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $requests = $this->engine->submittedBy($user, $organization);

        return Inertia::render('dashboard/ApprovalSubmitted', [
            'user' => $user,
            'requests' => $requests->map(fn (ApprovalRequest $request) => $this->serialize($request, $user))->values()->all(),
        ]);
    }

    public function approve(ApprovalRequest $approvalRequest, Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $approvalRequest->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $this->engine->approve($approvalRequest, $user, $validated['note'] ?? null);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Request approved.');
    }

    public function reject(ApprovalRequest $approvalRequest, Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $approvalRequest->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $this->engine->reject($approvalRequest, $user, $validated['note'] ?? null);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Request rejected.');
    }

    public function cancel(ApprovalRequest $approvalRequest): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $approvalRequest->organization_id === $organization->id, 403);

        try {
            $this->engine->cancel($approvalRequest, $user);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Request cancelled.');
    }

    private function serialize(ApprovalRequest $request, User $currentUser): array
    {
        $handler = $this->registry->handlerFor($request->module);

        $steps = $request->steps->map(function (ApprovalRequestStep $step) use ($currentUser, $request) {
            $actorLabel = $step->actor_type === 'role'
                ? ucfirst($step->actor_value)
                : ($step->actorUser?->name ?? $step->actor_value);

            return [
                'stepNo' => $step->step_no,
                'actorType' => $step->actor_type,
                'actorValue' => $step->actor_value,
                'actorLabel' => $actorLabel,
                'status' => $step->status,
                'note' => $step->note,
                'actedBy' => $step->acted_by ? ($step->actorUser?->name ?? 'User #'.$step->acted_by) : null,
                'actedAt' => $step->acted_at?->toISOString(),
                'canAct' => $step->status === ApprovalRequestStep::STATUS_PENDING
                    && $request->status === ApprovalRequest::STATUS_PENDING
                    && $this->engine->actorMatches($currentUser, $step),
            ];
        })->values()->all();

        $isRequester = $request->requested_by === $currentUser->id;
        $canCancel = $isRequester
            && $request->status === ApprovalRequest::STATUS_PENDING;

        return [
            'id' => $request->id,
            'module' => $request->module,
            'moduleLabel' => $handler?->label() ?? ucfirst(str_replace('_', ' ', $request->module)),
            'title' => $handler?->title($request) ?? $request->summary,
            'summary' => $handler?->summary($request) ?? $request->summary,
            'detail' => $handler?->detail($request) ?? [],
            'status' => $request->status,
            'currentStep' => $request->current_step,
            'submittedAt' => $request->submitted_at?->toISOString(),
            'completedAt' => $request->completed_at?->toISOString(),
            'requester' => $request->requester?->only('id', 'name', 'email'),
            'steps' => $steps,
            'canCancel' => $canCancel,
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        return Organization::query()->first();
    }
}