<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ReportCardTemplate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class ReportCardSetupsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $templates = ReportCardTemplate::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return inertia('dashboard/ReportCardSetups', [
            'user' => $user,
            'templates' => $templates->map(fn (ReportCardTemplate $template) => $this->payload($template))->values()->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $this->validatedPayload($request);

        $template = ReportCardTemplate::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'layout' => $validated['layout'] ?? 'standard',
            'show_rank' => (bool) ($validated['show_rank'] ?? false),
            'show_percentage' => (bool) ($validated['show_percentage'] ?? true),
            'show_remarks' => (bool) ($validated['show_remarks'] ?? true),
            'show_subject_wise_grade' => (bool) ($validated['show_subject_wise_grade'] ?? true),
            'header_color' => $validated['header_color'] ?? '#4f46e5',
            'remarks' => $validated['remarks'] ?? null,
            'is_default' => false,
        ]);

        if (!empty($validated['make_default'])) {
            $this->setDefault($organization, $template);
        }

        return back()->with('success', 'Report card template "'.$template->name.'" created.');
    }

    public function update(Request $request, ReportCardTemplate $reportCardTemplate): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $reportCardTemplate->organization_id === $organization->id, 403);

        $validated = $this->validatedPayload($request);

        $reportCardTemplate->update([
            'name' => $validated['name'],
            'layout' => $validated['layout'] ?? $reportCardTemplate->layout,
            'show_rank' => (bool) ($validated['show_rank'] ?? false),
            'show_percentage' => (bool) ($validated['show_percentage'] ?? true),
            'show_remarks' => (bool) ($validated['show_remarks'] ?? true),
            'show_subject_wise_grade' => (bool) ($validated['show_subject_wise_grade'] ?? true),
            'header_color' => $validated['header_color'] ?? $reportCardTemplate->header_color,
            'remarks' => $validated['remarks'] ?? null,
        ]);

        if (!empty($validated['make_default'])) {
            $this->setDefault($organization, $reportCardTemplate);
        }

        return back()->with('success', 'Report card template "'.$reportCardTemplate->name.'" updated.');
    }

    public function defaultAction(Request $request, ReportCardTemplate $reportCardTemplate): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $reportCardTemplate->organization_id === $organization->id, 403);

        $this->setDefault($organization, $reportCardTemplate);

        return back()->with('success', 'Default template set to "'.$reportCardTemplate->name.'".');
    }

    public function destroy(Request $request, ReportCardTemplate $reportCardTemplate): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $reportCardTemplate->organization_id === $organization->id, 403);

        $name = $reportCardTemplate->name;
        $reportCardTemplate->delete();

        return back()->with('success', 'Template "'.$name.'" deleted.');
    }

    private function setDefault(Organization $organization, ReportCardTemplate $template): void
    {
        ReportCardTemplate::query()
            ->where('organization_id', $organization->id)
            ->whereKeyNot($template->id)
            ->update(['is_default' => false]);

        $template->update(['is_default' => true]);
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'layout' => ['required', Rule::in(['standard', 'landscape'])],
            'show_rank' => ['nullable', 'boolean'],
            'show_percentage' => ['nullable', 'boolean'],
            'show_remarks' => ['nullable', 'boolean'],
            'show_subject_wise_grade' => ['nullable', 'boolean'],
            'header_color' => ['nullable', 'string', 'max:20'],
            'remarks' => ['nullable', 'string'],
            'make_default' => ['nullable', 'boolean'],
        ]);
    }

    private function payload(ReportCardTemplate $template): array
    {
        return [
            'id' => $template->id,
            'name' => $template->name,
            'layout' => $template->layout,
            'show_rank' => $template->show_rank,
            'show_percentage' => $template->show_percentage,
            'show_remarks' => $template->show_remarks,
            'show_subject_wise_grade' => $template->show_subject_wise_grade,
            'header_color' => $template->header_color,
            'remarks' => $template->remarks,
            'is_default' => $template->is_default,
        ];
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