<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Support\ModuleRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class ModuleManagementController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $groups = [];

        foreach (ModuleRegistry::all() as $module) {
            $groups[$module['group']][] = [
                'key' => $module['key'],
                'label' => $module['label'],
                'description' => $module['description'],
                'enabled' => $organization->moduleEnabled($module['key']),
                'core' => ModuleRegistry::isCore($module['key']),
            ];
        }

        return inertia('dashboard/ModuleManagement', [
            'user' => $user,
            'groups' => collect($groups)->map(fn (array $modules, string $group) => [
                'group' => $group,
                'modules' => $modules,
            ])->values()->all(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $request->validate([
            'module' => ['required', 'string', Rule::in(ModuleRegistry::keys())],
            'enabled' => ['required', 'boolean'],
        ]);

        abort_unless(! ModuleRegistry::isCore($validated['module']), 403);

        $organization->setModuleEnabled($validated['module'], (bool) $validated['enabled']);
        $organization->save();

        $state = $validated['enabled'] ? 'enabled' : 'disabled';

        return back()->with('success', sprintf('Module "%s" %s.', $validated['module'], $state));
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}