<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\AppearanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class DashboardThemesController extends Controller
{
    public function __construct(private readonly AppearanceService $appearance)
    {
    }

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $panelAppearance = $this->appearance->normalizePanelForOrganization($organization);

        return inertia('dashboard/Themes', [
            'user' => $user,
            'theme' => $organization->settings['dashboard_theme'] ?? 'system',
            'appearance' => $panelAppearance,
            'cssVariables' => $this->appearance->panelCssVariables($panelAppearance),
            'fontOptions' => AppearanceService::PANEL_FONTS,
            'densityOptions' => AppearanceService::PANEL_DENSITIES,
        ]);
    }

    public function updateTheme(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'theme' => ['required', 'string', Rule::in(['light', 'dark', 'system'])],
        ]);

        $settings = $organization->settings ?? [];
        $settings['dashboard_theme'] = $validated['theme'];
        $organization->update(['settings' => $settings]);

        return back()->with('success', 'Theme updated.');
    }

    public function updateAppearance(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->appearance->panelRules());

        $appearance = $this->appearance->normalizePanel($validated);

        $settings = $organization->settings ?? [];
        $settings['panel_appearance'] = $appearance;
        $organization->update(['settings' => $settings]);

        return back()->with('success', 'Branding updated.');
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