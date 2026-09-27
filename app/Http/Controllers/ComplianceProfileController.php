<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ComplianceProfileController extends Controller
{
    private const PROFILE_FIELDS = [
        'udise_code',
        'affiliation_no',
        'board',
        'affiliated_year',
        'school_category',
        'grades_offered',
        'medium_of_instruction',
        'shift_timings',
        'district',
        'block',
    ];

    private const FIELD_SETTINGS = [
        'enable_udise_display',
        'enable_affiliation_details',
        'enable_board_details',
        'enable_recognitions',
        'enable_grades_offered',
        'enable_medium_of_instruction',
        'enable_shift_timings',
    ];

    private const DEFAULT_PROFILE = [
        'udise_code' => '',
        'affiliation_no' => '',
        'board' => '',
        'affiliated_year' => '',
        'school_category' => '',
        'grades_offered' => '',
        'medium_of_instruction' => 'English',
        'shift_timings' => '',
        'district' => '',
        'block' => '',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($organization ? $user->role : '', ['admin', 'super_admin'], true), 403);

        return Inertia::render('dashboard/ComplianceProfile', [
            'user' => $user,
            'profile' => $this->normalizeProfile($organization),
            'fields' => $this->normalizeFieldSettings($organization),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $request->validate([
            'profile.udise_code' => ['nullable', 'string', 'max:20'],
            'profile.affiliation_no' => ['nullable', 'string', 'max:20'],
            'profile.board' => ['nullable', 'string', 'max:120'],
            'profile.affiliated_year' => ['nullable', 'string', 'max:20'],
            'profile.school_category' => ['nullable', 'string', 'max:60'],
            'profile.grades_offered' => ['nullable', 'string', 'max:120'],
            'profile.medium_of_instruction' => ['nullable', 'string', 'max:60'],
            'profile.shift_timings' => ['nullable', 'string', 'max:60'],
            'profile.district' => ['nullable', 'string', 'max:120'],
            'profile.block' => ['nullable', 'string', 'max:120'],
            'fields.enable_udise_display' => ['nullable', 'boolean'],
            'fields.enable_affiliation_details' => ['nullable', 'boolean'],
            'fields.enable_board_details' => ['nullable', 'boolean'],
            'fields.enable_recognitions' => ['nullable', 'boolean'],
            'fields.enable_grades_offered' => ['nullable', 'boolean'],
            'fields.enable_medium_of_instruction' => ['nullable', 'boolean'],
            'fields.enable_shift_timings' => ['nullable', 'boolean'],
        ]);

        $profile = collect(self::PROFILE_FIELDS)->mapWithKeys(fn (string $key) => [
            $key => $this->clean($validated['profile'][$key] ?? ''),
        ])->all();

        $fields = collect(self::FIELD_SETTINGS)->mapWithKeys(fn (string $key) => [
            $key => (bool) ($validated['fields'][$key] ?? false),
        ])->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'compliance_profile' => $profile,
                'compliance_fields' => $fields,
            ],
        ]);

        return redirect()->route('compliance.profile')->with('success', 'School compliance profile updated.');
    }

    private function clean(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function normalizeProfile(Organization $organization): array
    {
        $stored = is_array($organization->settings['compliance_profile'] ?? null)
            ? $organization->settings['compliance_profile']
            : [];

        return collect(self::DEFAULT_PROFILE)->mapWithKeys(fn (string $default, string $key) => [
            $key => trim((string) ($stored[$key] ?? $default)),
        ])->all();
    }

    private function normalizeFieldSettings(Organization $organization): array
    {
        $stored = is_array($organization->settings['compliance_fields'] ?? null)
            ? $organization->settings['compliance_fields']
            : [];

        return collect(self::FIELD_SETTINGS)->mapWithKeys(fn (string $key) => [
            $key => (bool) ($stored[$key] ?? $key === 'enable_udise_display'),
        ])->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}