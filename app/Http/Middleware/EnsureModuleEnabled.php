<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();

        if ($user && $this->moduleEnabledForUser($user, $module)) {
            return $next($request);
        }

        abort(403, 'This module is disabled for your organization.');
    }

    private function moduleEnabledForUser(User $user, string $module): bool
    {
        if (in_array($user->role, ['super_admin', 'branch_admin'], true)) {
            return true;
        }

        $organization = app(\App\Services\StaffPermissionService::class)->resolveOrganizationForUser($user);

        return $organization?->moduleEnabled($module) ?? false;
    }
}