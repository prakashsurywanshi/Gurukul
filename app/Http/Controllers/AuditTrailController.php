<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Throwable;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditTrailController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $page = max(1, (int) $request->query('page', 1));
        $search = trim((string) $request->query('search', ''));
        $action = trim((string) $request->query('action', ''));
        $module = trim((string) $request->query('module', ''));
        $startDate = trim((string) $request->query('start_date', ''));
        $endDate = trim((string) $request->query('end_date', ''));

        $query = AuditTrail::query()
            ->where('organization_id', $organization->id)
            ->with('user:id,name,email')
            ->when($search !== '', fn ($q) => $q->where('description', 'like', "%{$search}%"))
            ->when($action !== '', fn ($q) => $q->where('action', $action))
            ->when($module !== '', fn ($q) => $q->where('module', $module))
            ->when($startDate !== '', fn ($q) => $q->whereDate('created_at', '>=', $startDate))
            ->when($endDate !== '', fn ($q) => $q->whereDate('created_at', '<=', $endDate))
            ->latest();

        $paginator = (clone $query)->paginate(20, ['*'], 'page', $page)->withQueryString();

        return inertia('dashboard/AuditTrail', [
            'user' => $user,
            'trails' => collect($paginator->items())->map(fn (AuditTrail $trail) => [
                'id' => $trail->id,
                'action' => $trail->action,
                'module' => $trail->module ?: 'general',
                'model' => $trail->model_type ? class_basename($trail->model_type) : null,
                'model_id' => $trail->model_id,
                'description' => $trail->description,
                'old_values' => $trail->old_values,
                'new_values' => $trail->new_values,
                'ip_address' => $trail->ip_address,
                'user_agent' => $trail->user_agent,
                'user' => $trail->user ? ['id' => $trail->user->id, 'name' => $trail->user->name] : null,
                'created_at' => optional($trail->created_at)->format('d M Y, H:i:s'),
            ])->values()->all(),
            'pagination' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'perPage' => $paginator->perPage(),
            ],
            'filters' => [
                'search' => $search,
                'action' => $action,
                'module' => $module,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'actionOptions' => ['created', 'updated', 'deleted'],
            'moduleOptions' => $this->moduleOptions($organization),
            'retentionDays' => 90,
        ]);
    }

    public function clear(Request $request): \Illuminate\Http\RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        AuditTrail::query()->where('organization_id', $organization->id)->delete();

        return back()->with('success', 'Audit logs cleared.');
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $search = trim((string) $request->query('search', ''));
        $action = trim((string) $request->query('action', ''));
        $module = trim((string) $request->query('module', ''));
        $startDate = trim((string) $request->query('start_date', ''));
        $endDate = trim((string) $request->query('end_date', ''));

        $rows = AuditTrail::query()
            ->where('organization_id', $organization->id)
            ->with('user:id,name,email')
            ->when($search !== '', fn ($q) => $q->where('description', 'like', "%{$search}%"))
            ->when($action !== '', fn ($q) => $q->where('action', $action))
            ->when($module !== '', fn ($q) => $q->where('module', $module))
            ->when($startDate !== '', fn ($q) => $q->whereDate('created_at', '>=', $startDate))
            ->when($endDate !== '', fn ($q) => $q->whereDate('created_at', '<=', $endDate))
            ->latest()
            ->limit(5000)
            ->get();

        $fileName = 'audit-trail-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');

            fputcsv($out, ['Timestamp', 'User', 'Email', 'Action', 'Module', 'Model', 'Model ID', 'Description', 'IP Address']);

            foreach ($rows as $trail) {
                fputcsv($out, [
                    optional($trail->created_at)->format('Y-m-d H:i:s'),
                    $trail->user?->name ?: '',
                    $trail->user?->email ?: '',
                    $trail->action,
                    $trail->module ?: 'general',
                    $trail->model_type ? class_basename($trail->model_type) : '',
                    $trail->model_id ?: '',
                    $trail->description,
                    $trail->ip_address ?: '',
                ]);
            }

            fclose($out);
        }, $fileName, ['Content-Type' => 'text/csv']);
    }

    private function moduleOptions(Organization $organization): array
    {
        return AuditTrail::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('module')
            ->distinct()
            ->orderBy('module')
            ->pluck('module')
            ->map(fn (string $module) => [
                'value' => $module,
                'label' => ucfirst(str_replace('-', ' ', $module)),
            ])
            ->values()
            ->all();
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