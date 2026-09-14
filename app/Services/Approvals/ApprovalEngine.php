<?php

namespace App\Services\Approvals;

use App\Models\ApprovalFlow;
use App\Models\ApprovalFlowStep;
use App\Models\ApprovalRequest;
use App\Models\ApprovalRequestStep;
use App\Models\Organization;
use App\Models\User;
use App\Services\SystemNotificationService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ApprovalEngine
{
    public function __construct(
        private readonly ApprovalModuleRegistry $registry,
        private readonly SystemNotificationService $notifications,
    ) {
    }

    /**
     * Active workflow for a module, lazily creating a default single-step
     * admin chain the first time a module is used in an organization.
     */
    public function resolveFlow(Organization $organization, string $module): ?ApprovalFlow
    {
        $flow = ApprovalFlow::query()
            ->where('organization_id', $organization->id)
            ->where('module', $module)
            ->where('is_active', true)
            ->first();

        if ($flow) {
            return $flow;
        }

        $existing = ApprovalFlow::query()
            ->where('organization_id', $organization->id)
            ->where('module', $module)
            ->first();

        if ($existing) {
            return null;
        }

        return DB::transaction(function () use ($organization, $module) {
            $handler = $this->registry->handlerFor($module);
            $flow = ApprovalFlow::query()->create([
                'organization_id' => $organization->id,
                'module' => $module,
                'name' => $handler ? $handler->label() : ucwords(str_replace('_', ' ', $module)).' Approval',
                'is_active' => true,
            ]);

            ApprovalFlowStep::query()->create([
                'approval_flow_id' => $flow->id,
                'step_no' => 1,
                'actor_type' => 'role',
                'actor_value' => 'admin',
                'note' => 'Admin approval',
            ]);

            return $flow;
        });
    }

    /**
     * Submit a new approval request for a module record.
     *
     * @param  mixed  $record  Eloquent model instance carrying organization_id
     */
    public function submit(string $module, User $requester, mixed $record, ?string $summary = null): ApprovalRequest
    {
        $organization = $this->resolveOrganization($requester);
        $flow = $this->resolveFlow($organization, $module);

        $request = DB::transaction(function () use ($organization, $module, $requester, $record, $summary, $flow) {
            $request = ApprovalRequest::query()->create([
                'organization_id' => $organization->id,
                'module' => $module,
                'module_type' => $record::class,
                'module_id' => $record->id,
                'summary' => $summary,
                'status' => ApprovalRequest::STATUS_PENDING,
                'current_step' => $flow && $flow->steps()->exists() ? 1 : 0,
                'requested_by' => $requester->id,
                'submitted_at' => now(),
            ]);

            if ($flow) {
                foreach ($flow->steps as $step) {
                    ApprovalRequestStep::query()->create([
                        'approval_request_id' => $request->id,
                        'step_no' => $step->step_no,
                        'actor_type' => $step->actor_type,
                        'actor_value' => $step->actor_value,
                        'status' => ApprovalRequestStep::STATUS_PENDING,
                    ]);
                }
            }

            return $request;
        });

        $handler = $this->registry->handlerFor($module);
        if ($handler) {
            $handler->onSubmitted($organization, $request, $requester);
        }

        if ($request->current_step === 0) {
            return $this->finalizeApproved($request, $requester, 'Auto-approved (no approval chain configured).');
        }

        $this->notifyStepActors($request, $organization);

        return $request;
    }

    /**
     * Pending requests the given user may act on right now.
     *
     * @return EloquentCollection<int, ApprovalRequest>
     */
    public function actionableFor(User $user, Organization $organization): EloquentCollection
    {
        return ApprovalRequest::query()
            ->where('organization_id', $organization->id)
            ->where('status', ApprovalRequest::STATUS_PENDING)
            ->with(['requester', 'steps'])
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn (ApprovalRequest $request) => $this->canActOn($request, $user))
            ->values();
    }

    /**
     * Requests submitted by the given user (their outbox).
     *
     * @return EloquentCollection<int, ApprovalRequest>
     */
    public function submittedBy(User $user, Organization $organization): EloquentCollection
    {
        return ApprovalRequest::query()
            ->where('organization_id', $organization->id)
            ->where('requested_by', $user->id)
            ->with(['requester', 'steps'])
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Requests tied to a module record.
     */
    public function forRecord(string $moduleType, int $moduleId): ?ApprovalRequest
    {
        return ApprovalRequest::query()
            ->where('module_type', $moduleType)
            ->where('module_id', $moduleId)
            ->with(['requester', 'steps'])
            ->latest('id')
            ->first();
    }

    /**
     * Resolve the approval request for a module record, lazily submitting it
     * through the active flow when none exists yet (supports legacy records).
     *
     * @param  mixed  $record  Eloquent model instance carrying organization_id
     */
    public function ensureForRecord(string $module, User $requester, mixed $record, ?string $summary = null): ApprovalRequest
    {
        $existing = $this->forRecord($record::class, $record->id);

        return $existing ?: $this->submit($module, $requester, $record, $summary);
    }

    public function canActOn(ApprovalRequest $request, User $user): bool
    {
        $step = $this->currentStep($request);

        return $request->status === ApprovalRequest::STATUS_PENDING
            && $step
            && $step->status === ApprovalRequestStep::STATUS_PENDING
            && $this->actorMatches($user, $step);
    }

    public function approve(ApprovalRequest $request, User $actor, ?string $note = null): ApprovalRequest
    {
        $this->authorizeAction($request, $actor);

        $organization = $request->organization()->firstOrFail();
        $step = $this->currentStep($request);

        $step->forceFill([
            'status' => ApprovalRequestStep::STATUS_APPROVED,
            'acted_by' => $actor->id,
            'acted_at' => now(),
            'note' => $note ?: null,
        ])->save();

        $nextStepNo = $step->step_no + 1;
        $nextStep = $request->steps()->where('step_no', $nextStepNo)->first();

        if (! $nextStep) {
            return $this->finalizeApproved($request, $actor, $note);
        }

        $request->forceFill(['current_step' => $nextStepNo])->save();
        $this->notifyStepActors($request->fresh(), $organization);

        return $request->fresh();
    }

    public function reject(ApprovalRequest $request, User $actor, ?string $note = null): ApprovalRequest
    {
        $this->authorizeAction($request, $actor);

        $organization = $request->organization()->firstOrFail();
        $step = $this->currentStep($request);

        $step->forceFill([
            'status' => ApprovalRequestStep::STATUS_REJECTED,
            'acted_by' => $actor->id,
            'acted_at' => now(),
            'note' => $note ?: null,
        ])->save();

        $request->forceFill([
            'status' => ApprovalRequest::STATUS_REJECTED,
            'completed_at' => now(),
        ])->save();

        $handler = $this->registry->handlerFor($request->module);
        if ($handler) {
            $handler->onRejected($organization, $request, $actor, $note);
        }

        $this->notifyRequester($request, $organization, 'Request rejected', $request->summary);

        return $request->fresh();
    }

    public function cancel(ApprovalRequest $request, User $actor): ApprovalRequest
    {
        if ($request->requested_by !== $actor->id && $actor->role !== 'super_admin') {
            throw new HttpException(403, 'Only the requester can cancel this request.');
        }

        if ($request->status !== ApprovalRequest::STATUS_PENDING) {
            throw new HttpException(422, 'Only pending requests can be cancelled.');
        }

        $request->forceFill([
            'status' => ApprovalRequest::STATUS_CANCELLED,
            'completed_at' => now(),
        ])->save();

        $handler = $this->registry->handlerFor($request->module);
        if ($handler) {
            $handler->onCancelled($this->resolveOrganization($actor), $request, $actor);
        }

        return $request->fresh();
    }

    public function currentStep(ApprovalRequest $request): ?ApprovalRequestStep
    {
        if ($request->status !== ApprovalRequest::STATUS_PENDING) {
            return null;
        }

        return $request->steps()->where('step_no', $request->current_step)->first();
    }

    public function actorMatches(User $user, ApprovalRequestStep $step): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        return match ($step->actor_type) {
            'role' => $user->role === $step->actor_value,
            'user' => $user->id === (int) $step->actor_value,
            default => false,
        };
    }

    private function finalizeApproved(ApprovalRequest $request, User $actor, ?string $note): ApprovalRequest
    {
        $organization = $request->organization()->firstOrFail();

        $request->forceFill([
            'status' => ApprovalRequest::STATUS_APPROVED,
            'completed_at' => now(),
        ])->save();

        $handler = $this->registry->handlerFor($request->module);
        if ($handler) {
            $handler->onApproved($organization, $request->fresh(), $actor, $note);
        }

        $this->notifyRequester($request->fresh(), $organization, 'Request approved', $request->summary);

        return $request->fresh();
    }

    private function authorizeAction(ApprovalRequest $request, User $actor): void
    {
        if (! $this->canActOn($request, $actor)) {
            throw new HttpException(403, 'You are not authorized to review this request.');
        }
    }

    private function notifyStepActors(ApprovalRequest $request, Organization $organization): void
    {
        $step = $this->currentStep($request);
        if (! $step) {
            return;
        }

        $handler = $this->registry->handlerFor($request->module);
        $title = ($handler?->label() ?? 'Approval').' request';
        $message = $request->summary ?: $request->module.' approval request';

        $actors = $this->stepActors($step, $organization);
        foreach ($actors as $actor) {
            if ($actor->id === $request->requested_by) {
                continue;
            }

            $this->notifications->notifyUser(
                $actor,
                $organization,
                $this->notificationType($request->module),
                $title.' awaiting action',
                $message,
                ['action_label' => 'Review', 'action_url' => '/approvals/action-center'],
            );
        }
    }

    private function notifyRequester(ApprovalRequest $request, Organization $organization, string $title, ?string $message): void
    {
        $requester = $request->requester;
        if (! $requester) {
            return;
        }

        $this->notifications->notifyUser(
            $requester,
            $organization,
            $this->notificationType($request->module),
            $title,
            $message,
            ['action_label' => 'View', 'action_url' => '/approvals/submitted'],
        );
    }

    private function stepActors(ApprovalRequestStep $step, Organization $organization): EloquentCollection
    {
        if ($step->actor_type === 'user') {
            /** @phpstan-ignore-next-line */
            return User::query()->whereKey((int) $step->actor_value)->get();
        }

        return User::query()
            ->where('organization_id', $organization->id)
            ->where('role', $step->actor_value)
            ->where('status', 'active')
            ->get();
    }

    private function notificationType(string $module): string
    {
        return match ($module) {
            'fee_concession' => \App\Http\Controllers\NotificationCenterController::TYPE_FEE_CONCESSION,
            'attendance_correction' => \App\Http\Controllers\NotificationCenterController::TYPE_ATTENDANCE_CORRECTION,
            default => 'approval_request',
        };
    }

    private function resolveOrganization(User $user): Organization
    {
        $organization = $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;

        if ($organization) {
            return $organization;
        }

        if ($user->role === 'super_admin' || $user->role === 'admin') {
            $organization = Organization::query()->first();
        }

        if (! $organization) {
            throw new InvalidArgumentException('No organization is linked to this account.');
        }

        return $organization;
    }
}