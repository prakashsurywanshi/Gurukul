<?php

namespace App\Http\Controllers;

use App\Models\StudentCategory;
use App\Models\StudentHouse;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class HousesCategoriesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $houses = StudentHouse::query()
            ->where('organization_id', $organization->id)
            ->withCount(['students' => fn ($q) => $q->where('organization_id', $organization->id)->where('status', 'active')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($house) => [
                ...$house->only(['id', 'name', 'color', 'description', 'status', 'sort_order']),
                'studentCount' => $house->students_count,
            ]);

        $categories = StudentCategory::query()
            ->where('organization_id', $organization->id)
            ->withCount(['students' => fn ($q) => $q->where('organization_id', $organization->id)->where('status', 'active')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($category) => [
                ...$category->only(['id', 'name', 'description', 'status', 'sort_order']),
                'studentCount' => $category->students_count,
            ]);

        return Inertia::render('dashboard/HousesCategories', [
            'user' => $user,
            'houses' => $houses,
            'categories' => $categories,
        ]);
    }

    public function storeHouse(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('student_houses', 'name')->where('organization_id', $organization->id)],
            'name_hi' => ['nullable', 'string', 'max:255'],
            'name_mr' => ['nullable', 'string', 'max:255'],
            'color' => ['required', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        StudentHouse::query()->create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'name_hi' => $data['name_hi'] ?? null,
            'name_mr' => $data['name_mr'] ?? null,
            'color' => $data['color'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'House added.');
    }

    public function updateHouse(Request $request, StudentHouse $studentHouse): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($studentHouse->organization_id === $organization->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('student_houses', 'name')->where('organization_id', $organization->id)->ignore($studentHouse->id)],
            'name_hi' => ['nullable', 'string', 'max:255'],
            'name_mr' => ['nullable', 'string', 'max:255'],
            'color' => ['required', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $oldName = $studentHouse->name;
        $studentHouse->update($this->houseData($data));

        if ($oldName !== $studentHouse->name) {
            DB::table('students')
                ->where('organization_id', $organization->id)
                ->where('house', $oldName)
                ->update(['house' => $studentHouse->name]);
        }

        return back()->with('success', 'House updated.');
    }

    public function destroyHouse(Request $request, StudentHouse $studentHouse): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($studentHouse->organization_id === $organization->id, 404);

        $studentHouse->delete();

        return back()->with('success', 'House deleted.');
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('student_categories', 'name')->where('organization_id', $organization->id)],
            'name_hi' => ['nullable', 'string', 'max:255'],
            'name_mr' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        StudentCategory::query()->create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'name_hi' => $data['name_hi'] ?? null,
            'name_mr' => $data['name_mr'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Category added.');
    }

    public function updateCategory(Request $request, StudentCategory $studentCategory): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($studentCategory->organization_id === $organization->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('student_categories', 'name')->where('organization_id', $organization->id)->ignore($studentCategory->id)],
            'name_hi' => ['nullable', 'string', 'max:255'],
            'name_mr' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $oldName = $studentCategory->name;
        $studentCategory->update($this->categoryData($data));

        if ($oldName !== $studentCategory->name) {
            DB::table('students')
                ->where('organization_id', $organization->id)
                ->where('category', $oldName)
                ->update(['category' => $studentCategory->name]);
        }

        return back()->with('success', 'Category updated.');
    }

    public function destroyCategory(Request $request, StudentCategory $studentCategory): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        abort_unless($studentCategory->organization_id === $organization->id, 404);

        $studentCategory->delete();

        return back()->with('success', 'Category deleted.');
    }

    private function houseData(array $data): array
    {
        return [
            'name' => $data['name'],
            'name_hi' => $data['name_hi'] ?? null,
            'name_mr' => $data['name_mr'] ?? null,
            'color' => $data['color'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
            'sort_order' => $data['sort_order'] ?? 0,
        ];
    }

    private function categoryData(array $data): array
    {
        return [
            'name' => $data['name'],
            'name_hi' => $data['name_hi'] ?? null,
            'name_mr' => $data['name_mr'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
            'sort_order' => $data['sort_order'] ?? 0,
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