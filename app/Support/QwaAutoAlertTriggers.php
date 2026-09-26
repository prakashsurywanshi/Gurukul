<?php

namespace App\Support;

class QwaAutoAlertTriggers
{
    public const RECIPIENT_PARENTS = 'parents';

    public const RECIPIENT_STUDENTS = 'students';

    public const RECIPIENT_ROLES = 'roles';

    /**
     * Every automatic-alert trigger the product knows about. The engine only
     * activates triggers that have a registered builder (see
     * QwaAutoAlertService::builders); the rest stay visible for planning but
     * cannot be wired until their builder lands.
     *
     * delivery: event|schedule
     */
    public const TRIGGERS = [
        'fee_payment_received' => [
            'label' => 'Fee Payment Received',
            'description' => 'Sent when an offline or online fee payment is recorded successfully.',
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'fee_due' => [
            'label' => 'Fee Due Reminder',
            'description' => 'Scheduled daily scan that pings guardians of students with an overdue balance.',
            'delivery' => 'schedule',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'birthday' => [
            'label' => 'Birthday Greeting',
            'description' => 'Scheduled daily scan that greets students born on the current date.',
            'delivery' => 'schedule',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'complaint' => [
            'label' => 'Complaint Received',
            'description' => 'Sent to the configured staff roles when a complaint is lodged.',
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_ROLES,
        ],
        'admission_enquiry' => [
            'label' => 'Admission Enquiry Received',
            'description' => 'Sent to the configured staff roles when a new admission enquiry comes in.',
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_ROLES,
        ],
        'lead' => [
            'label' => 'New Lead Received',
            'description' => 'Sent to the configured staff roles when a new lead is captured.',
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_ROLES,
        ],
        'leave_request' => [
            'label' => 'Leave Request Submitted',
            'description' => 'Sent to the configured staff roles when staff submit a leave request.',
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_ROLES,
        ],
        'gate_pass_issued' => [
            'label' => 'Gate Pass Issued',
            'description' => "Sent to the student's guardians when a gate pass is issued.",
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'admission_confirmed' => [
            'label' => 'Admission Confirmed',
            'description' => "Sent to the newly admitted student's guardians.",
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'attendance_absent' => [
            'label' => 'Daily Absent Alert',
            'description' => 'Scheduled daily scan that pings guardians of students marked absent for the day.',
            'delivery' => 'schedule',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'exam_results_published' => [
            'label' => 'Exam Results Published',
            'description' => "Sent to guardians of the exam's students when the exam is published.",
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_PARENTS,
        ],
        'inventory_low_stock' => [
            'label' => 'Inventory Low Stock',
            'description' => 'Scheduled daily scan that alerts the configured staff roles about items at or below reorder level.',
            'delivery' => 'schedule',
            'default_recipient' => self::RECIPIENT_ROLES,
        ],
        'approval_request' => [
            'label' => 'Approval Request',
            'description' => 'Sent to the configured staff roles when an approval request is submitted or decided.',
            'delivery' => 'event',
            'default_recipient' => self::RECIPIENT_ROLES,
        ],
    ];

    public static function all(): array
    {
        return self::TRIGGERS;
    }

    public static function options(): array
    {
        return collect(self::TRIGGERS)
            ->map(fn (array $trigger) => $trigger['label'])
            ->all();
    }

    public static function keys(): array
    {
        return array_keys(self::TRIGGERS);
    }

    /**
     * Triggers allowed in the automatic-alerts UI. Filters the full catalogue
     * down to those the engine can actually build recipients for.
     *
     * @return array<int, string>
     */
    public static function supportedKeys(): array
    {
        return [
            'fee_payment_received',
            'fee_due',
            'birthday',
            'complaint',
            'admission_enquiry',
            'lead',
            'leave_request',
            'gate_pass_issued',
            'admission_confirmed',
            'attendance_absent',
            'exam_results_published',
            'inventory_low_stock',
            'approval_request',
        ];
    }

    public static function key(string $trigger): ?array
    {
        return self::TRIGGERS[$trigger] ?? null;
    }

    public static function label(string $trigger): string
    {
        return self::TRIGGERS[$trigger]['label'] ?? $trigger;
    }

    public static function delivery(string $trigger): string
    {
        return self::TRIGGERS[$trigger]['delivery'] ?? 'event';
    }

    public static function defaultRecipient(string $trigger): string
    {
        return self::TRIGGERS[$trigger]['default_recipient'] ?? self::RECIPIENT_ROLES;
    }
}