<?php

namespace App\Http\Controllers;

use App\Models\CocurricularArea;
use App\Models\CocurricularGrade;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CocurricularController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $areas = CocurricularArea::query()
            ->where('organization_id', $organization->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $grades = CocurricularGrade::query()
            ->where('organization_id', $organization->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return Inertia::render('dashboard/Cocurricular', [
            'user' => $user,
            'areas' => $areas,
            'grades' => $grades,
        ]);
    }

    public function storeArea(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('cocurricular_areas', 'name')->where('organization_id', $organization->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        CocurricularArea::query()->create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Co-curricular area added.');
    }

    public function updateArea(Request $request, CocurricularArea $cocurricularArea): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($cocurricularArea->organization_id === $organization->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('cocurricular_areas', 'name')->where('organization_id', $organization->id)->ignore($cocurricularArea->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $cocurricularArea->update($data);

        return back()->with('success', 'Co-curricular area updated.');
    }

    public function destroyArea(Request $request, CocurricularArea $cocurricularArea): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($cocurricularArea->organization_id === $organization->id, 404);

        $cocurricularArea->delete();

        return back()->with('success', 'Co-curricular area deleted.');
    }

    public function storeGrade(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('cocurricular_grades', 'name')->where('organization_id', $organization->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'min_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'max_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        CocurricularGrade::query()->create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'min_percentage' => $data['min_percentage'] ?? null,
            'max_percentage' => $data['max_percentage'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Co-curricular grade added.');
    }

    public function updateGrade(Request $request, CocurricularGrade $cocurricularGrade): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($cocurricularGrade->organization_id === $organization->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('cocurricular_grades', 'name')->where('organization_id', $organization->id)->ignore($cocurricularGrade->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'min_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'max_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $cocurricularGrade->update($data);

        return back()->with('success', 'Co-curricular grade updated.');
    }

    public function destroyGrade(Request $request, CocurricularGrade $cocurricularGrade): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($cocurricularGrade->organization_id === $organization->id, 404);

        $cocurricularGrade->delete();

        return back()->with('success', 'Co-curricular grade deleted.');
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

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