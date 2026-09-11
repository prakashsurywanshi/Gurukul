<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SalaryTemplate;
use App\Models\StaffSalary;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SalaryTemplatesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $templates = SalaryTemplate::query()
            ->where('organization_id', $organization->id)
            ->withCount('assignments')
            ->orderBy('name')
            ->get()
            ->map(fn (SalaryTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'basic' => (float) $template->basic,
                'hra' => (float) $template->hra,
                'specialAllowance' => (float) $template->special_allowance,
                'deductions' => $template->deductions ?? [],
                'gross' => (float) $template->gross,
                'netSalary' => (float) $template->net_salary,
                'status' => $template->status,
                'assignmentsCount' => $template->assignments_count,
                'description' => $template->description,
            ]);

        $assignments = StaffSalary::query()
            ->where('organization_id', $organization->id)
            ->with(['staff:id,name,role', 'template:id,name'])
            ->orderByDesc('effective_from')
            ->get()
            ->map(fn (StaffSalary $assignment) => [
                'id' => $assignment->id,
                'staffName' => $assignment->staff?->name,
                'staffRole' => RolePermissionCatalog::displayNameForSlug($assignment->staff?->role ?? '') ?? $assignment->staff?->role,
                'templateName' => $assignment->template?->name,
                'effectiveFrom' => $assignment->effective_from->toDateString(),
                'monthlyNet' => (float) $assignment->monthly_net,
                'status' => $assignment->status,
            ]);

        return Inertia::render('dashboard/SalaryTemplates', [
            'user' => $user,
            'templates' => $templates,
            'assignments' => $assignments,
            'staffOptions' => $this->staffOptions($organization),
            'summary' => [
                'activeTemplates' => $templates->filter(fn ($template) => $template['status'] === 'active')->count(),
                'activeAssignments' => $assignments->filter(fn ($assignment) => $assignment['status'] === 'active')->count(),
                'monthlyPayroll' => (float) StaffSalary::query()->where('organization_id', $organization->id)->where('status', 'active')->sum('monthly_net'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'basic' => ['required', 'numeric', 'min:0'],
            'hra' => ['nullable', 'numeric', 'min:0'],
            'special_allowance' => ['nullable', 'numeric', 'min:0'],
            'deductions' => ['nullable', 'array'],
            'deductions.*.name' => ['required', 'string', 'max:100'],
            'deductions.*.amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        [$gross, $net] = $this->computeSalary($validated);

        SalaryTemplate::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'basic' => $validated['basic'],
            'hra' => $validated['hra'] ?? 0,
            'special_allowance' => $validated['special_allowance'] ?? 0,
            'deductions' => $validated['deductions'] ?? [],
            'gross' => $gross,
            'net_salary' => $net,
            'status' => $validated['status'],
            'description' => $validated['description'] ?? null,
        ]);

        return back()->with('success', 'Salary template created.');
    }

    public function update(Request $request, SalaryTemplate $salaryTemplate): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($salaryTemplate->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'basic' => ['required', 'numeric', 'min:0'],
            'hra' => ['nullable', 'numeric', 'min:0'],
            'special_allowance' => ['nullable', 'numeric', 'min:0'],
            'deductions' => ['nullable', 'array'],
            'deductions.*.name' => ['required', 'string', 'max:100'],
            'deductions.*.amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        [$gross, $net] = $this->computeSalary($validated);

        $salaryTemplate->update([
            'name' => $validated['name'],
            'basic' => $validated['basic'],
            'hra' => $validated['hra'] ?? 0,
            'special_allowance' => $validated['special_allowance'] ?? 0,
            'deductions' => $validated['deductions'] ?? [],
            'gross' => $gross,
            'net_salary' => $net,
            'status' => $validated['status'],
            'description' => $validated['description'] ?? null,
        ]);

        return back()->with('success', 'Salary template updated.');
    }

    public function destroy(Request $request, SalaryTemplate $salaryTemplate): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($salaryTemplate->organization_id === $organization->id, 404);

        $salaryTemplate->delete();

        return back()->with('success', 'Salary template deleted.');
    }

    public function storeAssignment(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'staff_user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('organization_id', $organization->id)],
            'salary_template_id' => ['required', 'integer', Rule::exists('salary_templates', 'id')->where('organization_id', $organization->id)],
            'effective_from' => ['required', 'date'],
        ]);

        $template = SalaryTemplate::query()->findOrFail($validated['salary_template_id']);

        StaffSalary::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $validated['staff_user_id'],
            'salary_template_id' => $template->id,
            'effective_from' => $validated['effective_from'],
            'monthly_net' => $template->net_salary,
            'status' => 'active',
        ]);

        return back()->with('success', 'Salary assigned to staff.');
    }

    public function destroyAssignment(Request $request, StaffSalary $staffSalary): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($staffSalary->organization_id === $organization->id, 404);

        $staffSalary->delete();

        return back()->with('success', 'Salary assignment removed.');
    }

    private function computeSalary(array $validated): array
    {
        $deductionTotal = collect($validated['deductions'] ?? [])->sum(fn ($entry) => (float) $entry['amount']);
        $gross = round((float) $validated['basic'] + (float) ($validated['hra'] ?? 0) + (float) ($validated['special_allowance'] ?? 0), 2);
        $net = round($gross - $deductionTotal, 2);

        return [$gross, $net];
    }

    private function staffOptions(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => RolePermissionCatalog::displayNameForSlug($user->role) ?? $user->role,
            ])
            ->values()
            ->all();
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