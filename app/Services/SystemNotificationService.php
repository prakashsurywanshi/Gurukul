<?php

namespace App\Services;

use App\Events\SystemNotificationCreated;
use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;

class SystemNotificationService
{
    public function notifyAdmins(Organization $organization, string $type, string $title, string $message, array $data = []): void
    {
        if (! $this->pushNotificationsEnabled($organization)) {
            return;
        }

        $admins = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'super_admin'])
            ->where('status', 'active')
            ->get();

        foreach ($admins as $admin) {
            $this->notifyUser($admin, $organization, $type, $title, $message, $data);
        }
    }

    public function notifyUser(User $user, ?Organization $organization, string $type, string $title, string $message, array $data = []): void
    {
        if ($organization && ! $this->pushNotificationsEnabled($organization)) {
            return;
        }

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

    private function pushNotificationsEnabled(Organization $organization): bool
    {
        $settings = is_array($organization->settings['notification_settings'] ?? null)
            ? $organization->settings['notification_settings']
            : [];

        return (bool) ($settings['push_notifications'] ?? true);
    }
}