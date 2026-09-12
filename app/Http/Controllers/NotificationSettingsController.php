<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationSettingsController extends Controller
{
    private const DEFAULT_SETTINGS = [
        'email_alerts' => true,
        'push_notifications' => true,
        'sms_alerts' => false,
        'daily_digest' => true,
        'event_reminders' => true,
        'fee_due_reminders' => true,
        'attendance_alerts' => true,
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        return Inertia::render('dashboard/NotificationSettings', [
            'user' => $user,
            'settings' => $this->normalize($organization),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $request->validate([
            'email_alerts' => ['nullable', 'boolean'],
            'push_notifications' => ['nullable', 'boolean'],
            'sms_alerts' => ['nullable', 'boolean'],
            'daily_digest' => ['nullable', 'boolean'],
            'event_reminders' => ['nullable', 'boolean'],
            'fee_due_reminders' => ['nullable', 'boolean'],
            'attendance_alerts' => ['nullable', 'boolean'],
        ]);

        $settings = [];
        foreach (array_keys(self::DEFAULT_SETTINGS) as $key) {
            $settings[$key] = (bool) ($validated[$key] ?? false);
        }

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'notification_settings' => $settings,
            ],
        ]);

        return redirect()->route('notification-settings')->with('success', 'Notification settings saved.');
    }

    private function normalize(Organization $organization): array
    {
        $stored = is_array($organization->settings['notification_settings'] ?? null)
            ? $organization->settings['notification_settings']
            : [];

        $settings = [];
        foreach (self::DEFAULT_SETTINGS as $key => $default) {
            $settings[$key] = (bool) ($stored[$key] ?? $default);
        }

        return $settings;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}