<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TransportDeviceSettingsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];
        $key = $settings['transport']['sync_key'] ?? '';

        return inertia('dashboard/TransportDeviceSettings', [
            'user' => $user,
            'hasKey' => filled($key),
            'keyHint' => $key ? '••••' . substr($key, -4) : '',
            'endpoint' => url('/api/transport/gps'),
            'statusEndpoint' => url('/api/transport/gps/status'),
        ]);
    }

    public function regenerate()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];
        $settings['transport']['sync_key'] = Str::random(32);

        $organization->settings = $settings;
        $organization->save();

        return back()->with('success', 'Transport GPS sync key regenerated. Copy it once, it is shown only now.');
    }

    public function reveal()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];

        return response()->json([
            'key' => $settings['transport']['sync_key'] ?? '',
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