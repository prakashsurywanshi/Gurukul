<?php

namespace App\Services\Approvals;

use App\Models\ActivityLog;
use App\Models\ApprovalRequest;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;

class AttendanceCorrectionApprovalHandler implements ApprovalModuleHandler
{
    public static function module(): string
    {
        return 'attendance_correction';
    }

    public function label(): string
    {
        return 'Attendance Correction';
    }

    public function title(ApprovalRequest $request): string
    {
        $record = $this->record($request);

        return 'Attendance correction for '.optional($record->student)->first_name.' '.$record->date->format('Y-m-d');
    }

    public function summary(ApprovalRequest $request): string
    {
        $record = $this->record($request);
        $student = $record->student ?? null;

        return 'Attendance correction: '.($student->first_name ?? '').' '.$record->date->format('Y-m-d').' '.$record->current_status.' → '.$record->requested_status;
    }

    public function detail(ApprovalRequest $request): array
    {
        $record = $this->record($request);
        $student = $record->student ?? null;

        return [
            'Student' => trim(($student->first_name ?? '').' '.($student->last_name ?? '')).' ('.($student->admission_no ?? '').')',
            'Date' => $record->date->format('Y-m-d'),
            'Current status' => $record->current_status,
            'Requested status' => $record->requested_status,
            'Reason' => $record->reason,
            'Requested by' => $record->requester?->name,
        ];
    }

    public function onSubmitted(Organization $organization, ApprovalRequest $request, User $requester): void
    {
        // AttendanceCorrection already created with status pending by the controller.
    }

    public function onApproved(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void
    {
        $record = $this->record($request);

        if ($record->status !== 'pending') {
            return;
        }

        $studentClassId = $record->class_id ?: Student::query()->whereKey($record->student_id)->value('class_id');

        Attendance::query()->updateOrCreate(
            [
                'student_id' => $record->student_id,
                'date' => $record->date->toDateString(),
            ],
            [
                'organization_id' => $organization->id,
                'class_id' => $studentClassId,
                'status' => $record->requested_status,
                'remarks' => 'Updated via correction #'.$record->id,
                'marked_by' => $actor->id,
            ]
        );

        ActivityLog::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $actor->id,
            'action' => 'Approved',
            'module' => 'Attendance Correction',
            'record_type' => AttendanceCorrection::class,
            'record_id' => $record->id,
            'description' => 'Approved attendance correction for student #'.$record->student_id.' on '.$record->date->toDateString(),
        ]);

        $record->forceFill([
            'status' => 'approved',
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();
    }

    public function onRejected(Organization $organization, ApprovalRequest $request, User $actor, ?string $note): void
    {
        $record = $this->record($request);

        if ($record->status !== 'pending') {
            return;
        }

        $record->forceFill([
            'status' => 'rejected',
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();
    }

    public function onCancelled(Organization $organization, ApprovalRequest $request, User $actor): void
    {
        // No-op.
    }

    private function record(ApprovalRequest $request): AttendanceCorrection
    {
        return AttendanceCorrection::query()->find($request->module_id);
    }
}