<?php

namespace App\Http\Controllers;

use App\Models\CampusWorker;
use App\Models\Department;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CampusWorkerController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $workers = CampusWorker::query()
            ->where('organization_id', $organization->id)
            ->with('department:id,organization_id,name')
            ->orderBy('name')
            ->get()
            ->map(fn ($worker) => [
                ...$worker->only(['id', 'name', 'worker_type', 'phone', 'joining_date', 'shift', 'remarks', 'status']),
                'departmentId' => $worker->department_id,
                'departmentName' => $worker->department?->name,
            ]);

        $departmentOptions = Department::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('dashboard/CampusWorkers', [
            'workers' => $workers,
            'departmentOptions' => $departmentOptions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $data = $this->validated($request, $organization);

        CampusWorker::query()->create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'worker_type' => $data['worker_type'],
            'department_id' => $data['department_id'] ?? null,
            'phone' => $data['phone'] ?? null,
            'joining_date' => $data['joining_date'] ?? null,
            'shift' => $data['shift'] ?? null,
            'remarks' => $data['remarks'] ?? null,
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Campus worker added.');
    }

    public function update(Request $request, CampusWorker $campusWorker): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
        abort_unless($campusWorker->organization_id === $organization->id, 404);

        $data = $this->validated($request, $organization, $campusWorker);

        $campusWorker->update([
            'name' => $data['name'],
            'worker_type' => $data['worker_type'],
            'department_id' => $data['department_id'] ?? null,
            'phone' => $data['phone'] ?? null,
            'joining_date' => $data['joining_date'] ?? null,
            'shift' => $data['shift'] ?? null,
            'remarks' => $data['remarks'] ?? null,
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Campus worker updated.');
    }

    public function destroy(Request $request, CampusWorker $campusWorker): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
        abort_unless($campusWorker->organization_id === $organization->id, 404);

        $campusWorker->delete();

        return back()->with('success', 'Campus worker deleted.');
    }

    private function validated(Request $request, Organization $organization, ?CampusWorker $campusWorker = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'worker_type' => ['required', Rule::in(self::types())],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('organization_id', $organization->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'joining_date' => ['nullable', 'date'],
            'shift' => ['nullable', 'string', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }

    public static function types(): array
    {
        return [
            'gardener', 'peon', 'security', 'housekeeping', 'driver',
            'electrician', 'plumber', 'canteen', 'attendant', 'general',
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

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