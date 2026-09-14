<?php

namespace App\Services\Approvals;

use App\Models\ApprovalRequest;
use App\Models\LessonPlan;
use App\Models\Organization;
use App\Models\User;

class LessonPlanApprovalHandler implements ApprovalModuleHandler
{
    public static function module(): string
    {
        return 'lesson_plan';
    }

    public function label(): string
    {
        return 'Lesson Plan';
    }

    public function title(ApprovalRequest $request): string
    {
        $record = $this->record($request);

        return 'Lesson plan: '.($record->lesson_title ?? 'Untitled').' — '.optional($record->lesson_date)->format('Y-m-d');
    }

    public function summary(ApprovalRequest $request): string
    {
        $record = $this->record($request);

        return 'Lesson plan approval for '.($record->lesson_title ?? 'Untitled').' ('.optional($record->lesson_date)->format('Y-m-d').')';
    }

    public function detail(ApprovalRequest $request): array
    {
        $record = $this->record($request);

        return [
            'Lesson' => $record->lesson_title,
            'Topic' => $record->topic,
            'Date' => optional($record->lesson_date)->format('Y-m-d'),
            'Subject' => $record->subject?->name ?? (string) $record->subject_id,
            'Class' => trim(($record->schoolClass?->name ?? '').' '.($record->schoolClass?->section ?? '')),
            'Teacher' => $record->teacher?->name,
        ];
    }

    public function onSubmitted(Organization $organization, ApprovalRequest $request, User $requester): void
    {
        $record = $this->record($request);

        $record->update([
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    public function onApproved(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void
    {
        $record = $this->record($request);

        $record->update([
            'approved_by' => $actor->id,
            'approved_at' => now(),
        ]);
    }

    public function onRejected(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void
    {
        $record = $this->record($request);

        $record->update([
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    public function onCancelled(Organization $organization, ApprovalRequest $request, User $actor): void
    {
        $record = $this->record($request);

        $record->update([
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    private function record(ApprovalRequest $request): LessonPlan
    {
        return LessonPlan::query()->find($request->module_id);
    }
}