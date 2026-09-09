<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\GradingScaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class GradeScaleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return Inertia::render('dashboard/ManageGrades', [
            'user' => $user,
            'gradeScale' => GradingScaleService::effectiveScale($organization),
            'isDefault' => $organization->settings[GradingScaleService::SETTINGS_KEY] ?? null
                ? false
                : true,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:20'],
            'rows.*.grade' => ['required', 'string', 'max:10'],
            'rows.*.min' => ['required', 'numeric', 'min:0', 'max:100'],
            'rows.*.max' => ['required', 'numeric', 'min:0', 'max:100'],
            'rows.*.point' => ['required', 'numeric', 'min:0', 'max:10'],
            'rows.*.remark' => ['nullable', 'string', 'max:255'],
        ]);

        GradingScaleService::saveScale($organization, $validated['rows']);

        return back()->with('success', 'Grading scale saved successfully.');
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