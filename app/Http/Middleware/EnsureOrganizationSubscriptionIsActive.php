<?php

namespace App\Http\Middleware;

use App\Services\StaffPermissionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationSubscriptionIsActive
{
    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role === 'super_admin') {
            return $next($request);
        }

        if ($request->hasSession() && $request->session()->get('impersonator_role') === 'super_admin') {
            return $next($request);
        }

        $organization = $this->staffPermissionService->resolveOrganizationForUser($user);

        if (!$organization || $organization->hasActiveAccess()) {
            return $next($request);
        }

        $message = $organization->accessRestrictionMessage() ?? 'Your organization account is currently unavailable.';

        Auth::logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => $message], 403);
        }

        return redirect()
            ->route('login')
            ->withErrors(['email' => $message]);
    }
}
