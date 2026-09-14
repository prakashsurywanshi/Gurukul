<?php

namespace App\Services\Approvals;

use App\Models\ApprovalRequest;
use App\Models\Organization;
use App\Models\User;

interface ApprovalModuleHandler
{
    /**
     * Stable module key (e.g. 'fee_concession').
     */
    public static function module(): string;

    /**
     * Human-readable module label used across engine surfaces.
     */
    public function label(): string;

    /**
     * Reasonable title for a request (e.g. the record name).
     */
    public function title(ApprovalRequest $request): string;

    /**
     * One-line human-readable summary used in the approver inbox.
     */
    public function summary(ApprovalRequest $request): string;

    /**
     * Key/value rows rendered in the action center detail panel.
     */
    public function detail(ApprovalRequest $request): array;

    /**
     * Invoked right after a request is submitted (still pending).
     */
    public function onSubmitted(Organization $organization, ApprovalRequest $request, User $requester): void;

    /**
     * Invoked when the full chain resolves to approved.
     */
    public function onApproved(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void;

    /**
     * Invoked when the chain is rejected at any step.
     */
    public function onRejected(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void;

    /**
     * Invoked when the requester cancels a pending request.
     */
    public function onCancelled(Organization $organization, ApprovalRequest $request, User $actor): void;
}