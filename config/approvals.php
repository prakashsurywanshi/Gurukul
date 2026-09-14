<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Approval engine modules
    |--------------------------------------------------------------------------
    |
    | Each key is the module identifier used in approval_flows.module and in
    | ApprovalRequest::module. The value is the handler class that owns the
    | apply-on-approve business logic for that module.
    */

    'modules' => [
        'fee_concession' => App\Services\Approvals\FeeConcessionApprovalHandler::class,
        'attendance_correction' => App\Services\Approvals\AttendanceCorrectionApprovalHandler::class,
        'lesson_plan' => App\Services\Approvals\LessonPlanApprovalHandler::class,
    ],
];