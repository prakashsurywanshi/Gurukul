<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DemoLoginController extends Controller
{
    private const ROLE_MAP = [
        'schooladmin' => 'admin',
        'superadmin' => 'super_admin',
        'admin' => 'admin',
        'teacher' => 'teacher',
        'accountant' => 'accountant',
        'receptionist' => 'receptionist',
        'librarian' => 'librarian',
        'parent' => 'student',
        'student' => 'student',
    ];

    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
    }

    public function __invoke(Request $request, string $role)
    {
        abort_unless((bool) config('app.demo_login'), 404, 'Demo login is not enabled.');

        $targetRole = self::ROLE_MAP[$role] ?? null;
        abort_unless($targetRole, 404, 'Unknown demo role.');

        $user = $this->resolveUser($targetRole);

        if (! $user || $user->status === 'inactive' || $user->status === 'suspended') {
            return redirect('/login')->withErrors([
                'email' => 'No active demo account is available for this role.',
            ]);
        }

        $organization = $user->role !== 'super_admin'
            ? $this->staffPermissionService->resolveOrganizationForUser($user)
            : null;

        if ($organization && ! $organization->hasActiveAccess()) {
            return redirect('/login')->withErrors([
                'email' => $organization->accessRestrictionMessage() ?? 'Your organization account is currently unavailable.',
            ]);
        }

        Auth::login($user);

        ActivityLog::create([
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
            'action' => 'login',
            'module' => 'auth',
            'description' => $user->name.' logged in via demo login.',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect($this->staffPermissionService->landingPathFor($user));
    }

    private function resolveUser(string $role): ?User
    {
        if ($role === 'super_admin') {
            return User::query()
                ->where('role', 'super_admin')
                ->where('status', 'active')
                ->orderBy('id')
                ->first();
        }

        $organization = Organization::query()->orderBy('id')->first();

        if (! $organization) {
            return null;
        }

        return User::query()
            ->where('organization_id', $organization->id)
            ->where('role', $role)
            ->where('status', 'active')
            ->orderBy('id')
            ->first();
    }
}