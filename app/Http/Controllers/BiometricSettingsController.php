<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class BiometricSettingsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];
        $key = $settings['biometric']['sync_key'] ?? '';

        return inertia('dashboard/BiometricSettings', [
            'user' => $user,
            'hasKey' => filled($key),
            'keyHint' => $key ? '••••' . substr($key, -4) : '',
            'endpoint' => url('/api/biometric/attendance'),
            'logsEndpoint' => url('/api/biometric/logs'),
            'statusEndpoint' => url('/api/biometric/status'),
        ]);
    }

    public function regenerate()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];
        $settings['biometric']['sync_key'] = Str::random(32);

        $organization->settings = $settings;
        $organization->save();

        return back()->with('success', 'Biometric sync key regenerated. Copy it once, it is shown only now.');
    }

    public function reveal()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];

        return response()->json([
            'key' => $settings['biometric']['sync_key'] ?? '',
        ]);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        return null;
    }
}