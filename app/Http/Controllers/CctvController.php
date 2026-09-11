<?php

namespace App\Http\Controllers;

use App\Models\CctvAccessLog;
use App\Models\CctvCamera;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CctvController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $cameras = CctvCamera::query()
            ->where('organization_id', $organization->id)
            ->withCount('accessLogs')
            ->orderBy('location')
            ->orderBy('name')
            ->get()
            ->map(fn (CctvCamera $camera) => [
                'id' => $camera->id,
                'name' => $camera->name,
                'location' => $camera->location,
                'streamUrl' => $camera->stream_url,
                'cameraType' => $camera->camera_type,
                'isActive' => $camera->is_active,
                'notes' => $camera->notes,
                'accessCount' => $camera->access_logs_count,
            ])
            ->values();

        $logs = CctvAccessLog::query()
            ->where('organization_id', $organization->id)
            ->with('camera:id,name,location')
            ->with('user:id,name,role')
            ->latest()
            ->take(100)
            ->get()
            ->map(fn (CctvAccessLog $log) => [
                'id' => $log->id,
                'cameraName' => $log->camera?->name ?? 'Unknown camera',
                'location' => $log->camera?->location,
                'userName' => $log->user?->name ?? 'System',
                'action' => $log->action,
                'ipAddress' => $log->ip_address,
                'createdAt' => $log->created_at?->toDateTimeString(),
            ])
            ->values();

        return Inertia::render('dashboard/Cctv', [
            'user' => $user,
            'cameras' => $cameras,
            'logs' => $logs,
            'summary' => [
                'cameras' => $cameras->count(),
                'active' => $cameras->filter(fn ($camera) => $camera['isActive'])->count(),
                'views' => $logs->filter(fn ($log) => $log['action'] === 'view')->count(),
                'exports' => $logs->filter(fn ($log) => $log['action'] === 'export')->count(),
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
            'location' => ['nullable', 'string', 'max:255'],
            'stream_url' => ['nullable', 'string', 'max:500'],
            'camera_type' => ['required', Rule::in(['indoor', 'outdoor', 'gate', 'classroom', 'corridor'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $camera = CctvCamera::query()->create($validated + [
            'organization_id' => $organization->id,
            'is_active' => true,
        ]);

        CctvAccessLog::query()->create([
            'organization_id' => $organization->id,
            'cctv_camera_id' => $camera->id,
            'user_id' => $user->id,
            'action' => 'camera_added',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Camera added.');
    }

    public function toggle(Request $request, CctvCamera $camera): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($camera->organization_id === $organization->id, 404);

        $camera->update(['is_active' => !$camera->is_active]);

        return back()->with('success', 'Camera updated.');
    }

    public function destroy(Request $request, CctvCamera $camera): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($camera->organization_id === $organization->id, 404);

        $camera->delete();

        return back()->with('success', 'Camera removed.');
    }

    public function logAction(Request $request, CctvCamera $camera): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless($camera->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['view', 'export', 'search_photo'])],
        ]);

        CctvAccessLog::query()->create([
            'organization_id' => $organization->id,
            'cctv_camera_id' => $camera->id,
            'user_id' => $user->id,
            'action' => $validated['action'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Access logged.');
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