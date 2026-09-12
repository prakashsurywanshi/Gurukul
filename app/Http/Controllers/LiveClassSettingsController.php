<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LiveClassSettingsController extends Controller
{
    private const DEFAULT_SETTINGS = [
        'default_platform' => 'google_meet',
        'max_participants' => '100',
        'auto_record' => true,
        'allow_chat' => true,
        'send_join_notifications' => true,
        'require_approval' => false,
    ];

    private const PLATFORMS = ['google_meet', 'zoom', 'microsoft_teams'];

    private const FIELDS = [
        'default_platform' => 'string',
        'max_participants' => 'string',
        'auto_record' => 'boolean',
        'allow_chat' => 'boolean',
        'send_join_notifications' => 'boolean',
        'require_approval' => 'boolean',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        return Inertia::render('dashboard/LiveClassSettings', [
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

        $rules = [];
        foreach (self::FIELDS as $key => $type) {
            $rules[$key] = $type === 'boolean' ? ['nullable', 'boolean'] : ['nullable', 'string', 'max:60'];
        }

        $validated = $request->validate($rules);

        $settings = [];
        foreach (self::FIELDS as $key => $type) {
            $settings[$key] = $type === 'boolean'
                ? (bool) ($validated[$key] ?? false)
                : trim((string) ($validated[$key] ?? (self::DEFAULT_SETTINGS[$key] ?? '')));
        }

        if (! in_array($settings['default_platform'], self::PLATFORMS, true)) {
            $settings['default_platform'] = 'google_meet';
        }

        if (! ctype_digit($settings['max_participants']) || (int) $settings['max_participants'] < 1) {
            $settings['max_participants'] = '100';
        }

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'live_class_settings' => $settings,
            ],
        ]);

        return redirect()->route('live-classes.settings')->with('success', 'Live class settings saved.');
    }

    private function normalize(Organization $organization): array
    {
        $stored = is_array($organization->settings['live_class_settings'] ?? null)
            ? $organization->settings['live_class_settings']
            : [];

        $settings = [];
        foreach (self::FIELDS as $key => $type) {
            $settings[$key] = $type === 'boolean'
                ? (bool) ($stored[$key] ?? self::DEFAULT_SETTINGS[$key])
                : trim((string) ($stored[$key] ?? self::DEFAULT_SETTINGS[$key]));
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