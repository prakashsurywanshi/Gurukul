<?php

namespace App\Http\Controllers;

use App\Models\Facility;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FacilityController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $facilities = Facility::query()
            ->where('organization_id', $organization->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($facility) => [
                ...$facility->only(['id', 'name', 'facility_type', 'capacity', 'location', 'description', 'status', 'sort_order']),
            ]);

        return Inertia::render('dashboard/Facilities', [
            'user' => $user,
            'facilities' => $facilities,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('facilities', 'name')->where('organization_id', $organization->id)],
            'facility_type' => ['required', Rule::in(self::types())],
            'capacity' => ['nullable', 'integer', 'min:0', 'max:99999'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        Facility::query()->create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'facility_type' => $data['facility_type'],
            'capacity' => $data['capacity'] ?? null,
            'location' => $data['location'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Facility added.');
    }

    public function update(Request $request, Facility $facility): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
        abort_unless($facility->organization_id === $organization->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('facilities', 'name')->where('organization_id', $organization->id)->ignore($facility->id)],
            'facility_type' => ['required', Rule::in(self::types())],
            'capacity' => ['nullable', 'integer', 'min:0', 'max:99999'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $facility->update([
            'name' => $data['name'],
            'facility_type' => $data['facility_type'],
            'capacity' => $data['capacity'] ?? null,
            'location' => $data['location'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Facility updated.');
    }

    public function destroy(Request $request, Facility $facility): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
        abort_unless($facility->organization_id === $organization->id, 404);

        $facility->delete();

        return back()->with('success', 'Facility deleted.');
    }

    public static function types(): array
    {
        return [
            'classroom', 'laboratory', 'library', 'sports', 'auditorium',
            'canteen', 'playground', 'office', 'washroom', 'transport', 'other',
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