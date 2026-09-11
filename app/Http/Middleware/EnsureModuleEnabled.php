<?php

namespace App\Http\Middleware;

use App\Models\Organization;
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
        if ($user->role === 'super_admin') {
            return true;
        }

        $organization = $this->resolveOrganizationForUser($user);

        return $organization?->moduleEnabled($module) ?? false;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        return null;
    }
}