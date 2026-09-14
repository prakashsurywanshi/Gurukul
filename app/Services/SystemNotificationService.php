<?php

namespace App\Services;

use App\Events\SystemNotificationCreated;
use App\Models\NotificationRule;
use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;

class SystemNotificationService
{
    private const EVENT_SETTING_MAP = [
        'leave_request' => 'event_reminders',
        'admission_enquiry' => 'push_notifications',
        'lead' => 'push_notifications',
        'complaint' => 'push_notifications',
        'attendance_correction' => 'attendance_alerts',
        'fee_concession' => 'fee_due_reminders',
        'approval_request' => 'push_notifications',
        'fee_due' => 'fee_due_reminders',
    ];

    public function notifyAdmins(Organization $organization, string $type, string $title, string $message, array $data = []): void
    {
        if (! $this->shouldNotify($organization, $type)) {
            return;
        }

        $rule = $this->resolveRule($organization, $type);
        if (! $rule->is_active) {
            return;
        }

        $roles = $rule->recipient_roles ?? ['admin', 'super_admin'];

        $admins = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', $roles)
            ->where('status', 'active')
            ->get();

        foreach ($admins as $admin) {
            $this->createNotification($admin, $organization, $type, $title, $message, $data);
        }
    }

    public function notifyUser(User $user, ?Organization $organization, string $type, string $title, string $message, array $data = []): void
    {
        if ($organization && ! $this->shouldNotify($organization, $type)) {
            return;
        }

        $this->createNotification($user, $organization, $type, $title, $message, $data);
    }

    public function shouldNotify(Organization $organization, string $eventType): bool
    {
        $settings = $this->getSettings($organization);

        if (! ($settings['push_notifications'] ?? true)) {
            return false;
        }

        $settingKey = self::EVENT_SETTING_MAP[$eventType] ?? null;
        if ($settingKey && isset($settings[$settingKey])) {
            return (bool) $settings[$settingKey];
        }

        return true;
    }

    public function getSettings(Organization $organization): array
    {
        $stored = is_array($organization->settings['notification_settings'] ?? null)
            ? $organization->settings['notification_settings']
            : [];

        $defaults = [
            'email_alerts' => true,
            'push_notifications' => true,
            'sms_alerts' => false,
            'daily_digest' => true,
            'event_reminders' => true,
            'fee_due_reminders' => true,
            'attendance_alerts' => true,
        ];

        $settings = [];
        foreach ($defaults as $key => $default) {
            $settings[$key] = (bool) ($stored[$key] ?? $default);
        }

        return $settings;
    }

    public function resolveRule(Organization $organization, string $eventType): NotificationRule
    {
        return NotificationRule::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'event_type' => $eventType,
            ],
            [
                'label' => ucwords(str_replace('_', ' ', $eventType)),
                'is_active' => true,
                'channels' => ['bell'],
                'recipient_roles' => null,
            ]
        );
    }

    private function createNotification(User $user, ?Organization $organization, string $type, string $title, string $message, array $data = []): void
    {
        $notification = SystemNotification::query()->create([
            'organization_id' => $organization?->id,
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);

        SystemNotificationCreated::dispatch($notification);
    }
}