<?php

namespace App\Http\Controllers;

use App\Models\BiometricDevice;
use App\Models\BiometricLog;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BiometricDeviceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $devices = BiometricDevice::query()
            ->where('organization_id', $organization->id)
            ->withCount('logs')
            ->orderBy('location')
            ->orderBy('name')
            ->get()
            ->map(fn (BiometricDevice $device) => [
                'id' => $device->id,
                'name' => $device->name,
                'deviceType' => $device->device_type,
                'location' => $device->location,
                'serialNumber' => $device->serial_number,
                'apiUrl' => $device->api_url,
                'isActive' => $device->is_active,
                'notes' => $device->notes,
                'logCount' => $device->logs_count,
            ])
            ->values();

        $logs = BiometricLog::query()
            ->where('organization_id', $organization->id)
            ->with('device:id,name,location')
            ->latest('event_time')
            ->latest('id')
            ->take(200)
            ->get()
            ->map(fn (BiometricLog $log) => [
                'id' => $log->id,
                'logType' => $log->log_type,
                'deviceName' => $log->device?->name ?? '—',
                'deviceLocation' => $log->device?->location,
                'personType' => $log->person_type,
                'personName' => $log->person_name,
                'uid' => $log->uid,
                'direction' => $log->direction,
                'matched' => $log->matched,
                'action' => $log->action,
                'details' => $log->details,
                'eventTime' => $log->event_time?->toDateTimeString(),
            ])
            ->values();

        return Inertia::render('dashboard/BiometricDevices', [
            'user' => $user,
            'devices' => $devices,
            'logs' => $logs,
            'summary' => [
                'devices' => $devices->count(),
                'active' => $devices->filter(fn ($device) => $device['isActive'])->count(),
                'attendance' => $logs->filter(fn ($log) => $log['logType'] === 'attendance')->count(),
                'face' => $logs->filter(fn ($log) => $log['logType'] === 'face')->count(),
                'agent' => $logs->filter(fn ($log) => $log['logType'] === 'agent')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'device_type' => ['required', Rule::in(['fingerprint', 'face', 'iris', 'card'])],
            'location' => ['nullable', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'api_url' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        BiometricDevice::query()->create($validated + [
            'organization_id' => $organization->id,
            'is_active' => true,
        ]);

        return back()->with('success', 'Biometric device added.');
    }

    public function update(Request $request, BiometricDevice $device): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($device->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'device_type' => ['required', Rule::in(['fingerprint', 'face', 'iris', 'card'])],
            'location' => ['nullable', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'api_url' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $device->update($validated);

        return back()->with('success', 'Biometric device updated.');
    }

    public function toggle(Request $request, BiometricDevice $device): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($device->organization_id === $organization->id, 404);

        $device->update(['is_active' => !$device->is_active]);

        return back()->with('success', 'Biometric device updated.');
    }

    public function destroy(Request $request, BiometricDevice $device): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($device->organization_id === $organization->id, 404);

        $device->delete();

        return back()->with('success', 'Biometric device removed.');
    }

    public function storeLog(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'biometric_device_id' => ['required', 'exists:biometric_devices,id'],
            'log_type' => ['required', Rule::in(['attendance', 'face', 'agent'])],
            'person_type' => ['nullable', 'string', 'max:255'],
            'person_name' => ['nullable', 'string', 'max:255'],
            'uid' => ['nullable', 'string', 'max:255'],
            'direction' => ['nullable', Rule::in(['in', 'out'])],
            'matched' => ['sometimes', 'boolean'],
            'action' => ['nullable', 'string', 'max:255'],
            'details' => ['nullable', 'string', 'max:2000'],
            'event_time' => ['nullable', 'date'],
        ]);

        $device = BiometricDevice::query()->findOrFail($validated['biometric_device_id']);
        abort_unless($device->organization_id === $organization->id, 404);

        BiometricLog::query()->create($validated + [
            'organization_id' => $organization->id,
            'event_time' => $validated['event_time'] ?? now(),
        ]);

        return back()->with('success', 'Biometric log recorded.');
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}