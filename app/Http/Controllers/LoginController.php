<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\StaffPermissionService;

class LoginController extends Controller
{
    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
    }

    public function viewLogin()
    {
        if (Auth::check()) {
            return redirect($this->staffPermissionService->landingPathFor(Auth::user()));
        }

        $organization = Organization::query()
            ->orderBy('id')
            ->first(['name', 'logo']);

        return inertia('LoginPage', [
            'schoolName' => $organization?->name,
            'schoolLogo' => $organization?->logo,
        ]);
    }
    
    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials)) {
            $user = Auth::user();

            if ($user && $this->isStaffUser($user->role) && $user->status === 'inactive') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'email' => 'Your staff account is inactive. Please contact administrator.',
                ])->onlyInput('email');
            }

            if ($user && $this->isStaffUser($user->role) && $user->status === 'suspended') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'email' => 'Your staff account is suspended. Please contact administrator.',
                ])->onlyInput('email');
            }

            $organization = $user && $user->role !== 'super_admin'
                ? $this->staffPermissionService->resolveOrganizationForUser($user)
                : null;

            if ($organization && !$organization->hasActiveAccess()) {
                $message = $organization->accessRestrictionMessage() ?? 'Your organization account is currently unavailable.';

                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'email' => $message,
                ])->onlyInput('email');
            }

            ActivityLog::create([
                'organization_id' => $user->organization_id,
                'user_id' => $user->id,
                'action' => 'login',
                'module' => 'auth',
                'description' => $user->name . ' logged in successfully.',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return redirect($this->staffPermissionService->landingPathFor($user));
        }

        return back()->withErrors([
            'email' => 'Invalid credentials',
        ]);
    }

    private function isStaffUser(?string $role): bool
    {
        return in_array($role, ['admin', 'receptionist', 'teacher', 'accountant', 'librarian'], true);
    }
}
