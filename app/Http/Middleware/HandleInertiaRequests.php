<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Support\ModuleRegistry;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'timetableConflict' => fn () => $request->session()->get('timetableConflict'),
                'feeImportResult' => fn () => $request->session()->get('feeImportResult'),
                'feeCarryForwardResult' => fn () => $request->session()->get('feeCarryForwardResult'),
            ],
            'activeSession' => fn () => $this->resolveActiveSession($request),
            'schoolName' => fn () => $this->resolveSchoolName($request),
            'schoolLogo' => fn () => $this->resolveSchoolLogo($request),
            'subscriptionNotice' => fn () => $this->resolveSubscriptionNotice($request),
            'staffPermissions' => fn () => app(StaffPermissionService::class)->featurePermissionsFor($request->user()),
            'modules' => fn () => $this->resolveModules($request),
            'impersonation' => fn () => $this->resolveImpersonation($request),
            'languageSettings' => fn () => $this->resolveLanguageSettings($request),
        ];
    }

    private function resolveModules(Request $request): array
    {
        $user = $request->user();

        if (!$user) {
            return [];
        }

        $organizationId = $this->resolveOrganizationId($request);
        $organization = $organizationId ? Organization::query()->find($organizationId) : null;

        if (!$organization) {
            return [];
        }

        $flags = [];

        foreach (ModuleRegistry::keys() as $key) {
            $flags[$key] = $organization->moduleEnabled($key);
        }

        return $flags;
    }

    private function resolveLanguageSettings(Request $request): array
    {
        $organizationId = $this->resolveOrganizationId($request);
        $organization = $organizationId ? Organization::query()->find($organizationId) : null;

        $locale = $request->attributes->get('locale');

        return app(\App\Services\LanguageService::class)->payload($organization, is_string($locale) ? $locale : null);
    }

    private function resolveImpersonation(Request $request): ?array
    {
        $impersonatorId = $request->session()->get('impersonator_id');
        $impersonatorRole = $request->session()->get('impersonator_role');

        if (! $impersonatorId || $impersonatorRole !== 'super_admin') {
            return null;
        }

        $impersonator = User::query()->find($impersonatorId);

        if (! $impersonator) {
            return null;
        }

        return [
            'isImpersonating' => true,
            'impersonator' => [
                'id' => $impersonator->id,
                'name' => $impersonator->name,
                'email' => $impersonator->email,
                'role' => $impersonator->role,
            ],
        ];
    }

    private function resolveActiveSession(Request $request): ?string
    {
        $organizationId = $this->resolveOrganizationId($request);
        if (!$organizationId) {
            return null;
        }

        $organization = Organization::query()->find($organizationId);

        return $organization?->selectedSessionName();
    }

    private function resolveSchoolName(Request $request): ?string
    {
        $organizationId = $this->resolveOrganizationId($request);

        if (!$organizationId) {
            if (Organization::query()->count() === 1) {
                return Organization::query()->value('name');
            }

            return null;
        }

        return Organization::query()
            ->whereKey($organizationId)
            ->value('name');
    }

    private function resolveSchoolLogo(Request $request): ?string
    {
        $organizationId = $this->resolveOrganizationId($request);

        if (!$organizationId) {
            if (Organization::query()->count() === 1) {
                return Organization::query()->value('logo');
            }

            return null;
        }

        return Organization::query()
            ->whereKey($organizationId)
            ->value('logo');
    }

    private function resolveOrganizationId(Request $request): ?int
    {
        $user = $request->user();

        if (!$user) {
            $organization = Organization::query()->first();

            return $organization ? (int) $organization->id : null;
        }

        $organizationId = $user->organization_id;

        if (!$organizationId && $user->role === 'admin') {
            $organization = Organization::query()
                ->where('email', $user->email)
                ->first();

            if (!$organization && Organization::query()->count() === 1) {
                $organization = Organization::query()->first();
            }

            if ($organization) {
                $user->forceFill(['organization_id' => $organization->id])->save();
                $organizationId = $organization->id;
            }
        }

        return $organizationId ? (int) $organizationId : null;
    }

    private function resolveSubscriptionNotice(Request $request): ?array
    {
        $user = $request->user();

        if (!$user || $user->role === 'super_admin') {
            return null;
        }

        $organization = app(StaffPermissionService::class)->resolveOrganizationForUser($user);

        if (!$organization) {
            return null;
        }

        $message = $organization->expiryWarningMessage(10);
        $daysUntilExpiry = $organization->daysUntilExpiry();

        if (!$message || $daysUntilExpiry === null) {
            return null;
        }

        return [
            'message' => $message,
            'daysUntilExpiry' => $daysUntilExpiry,
            'expiryDate' => optional($organization->subscription_end_date)->toDateString(),
        ];
    }
}
