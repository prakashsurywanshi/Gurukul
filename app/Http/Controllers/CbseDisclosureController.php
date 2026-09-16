<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\ActiveOrgResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CbseDisclosureController extends Controller
{
    private const DEFAULT_SECTIONS = [
        'school_name_address' => ['label' => 'School Name & Address', 'description' => 'Complete school name and postal address as per affiliation records.', 'multiline' => true],
        'phone_email_website' => ['label' => 'Phone, E-mail & Website', 'description' => 'Official school contact numbers, e-mail ID and website URL.', 'multiline' => true],
        'school_category' => ['label' => 'School Category', 'description' => 'Boys / Girls / Co-educational, day school or residential.', 'multiline' => false],
        'affiliation_number' => ['label' => 'Affiliation Number', 'description' => 'CBSE affiliation number as mentioned on the affiliation certificate.', 'multiline' => false],
        'affiliation_status' => ['label' => 'Status of Affiliation', 'description' => 'Provisional or Regular affiliation status.', 'multiline' => false],
        'affiliation_period' => ['label' => 'Affiliation Period', 'description' => 'Validity period of the current affiliation.', 'multiline' => false],
        'school_management_committee' => ['label' => 'Members of School Management Committee', 'description' => 'List of committee members with designations.', 'multiline' => true],
        'principal_details' => ['label' => 'Name of Principal', 'description' => 'Name and qualification of the principal.', 'multiline' => false],
        'campus_land_building' => ['label' => 'Land & Building', 'description' => 'Total land area and building details of the school campus.', 'multiline' => true],
        'playing_area' => ['label' => 'Playground / Play Area', 'description' => 'Details of playground and sports area available on campus.', 'multiline' => true],
        'toilets' => ['label' => 'Toilets', 'description' => 'Number of boys and girls toilets available in the school.', 'multiline' => true],
        'drinking_water' => ['label' => 'Drinking Water Facility', 'description' => 'Drinking water arrangement details and filter/RO availability.', 'multiline' => true],
        'child_safety_cctv' => ['label' => 'Child Safety & CCTV', 'description' => 'CCTV coverage, safety measures and emergency protocols.', 'multiline' => true],
        'student_strength' => ['label' => 'Student Strength', 'description' => 'Total number of students per class or overall strength.', 'multiline' => true],
        'staff_strength' => ['label' => 'Teaching & Non-Teaching Staff', 'description' => 'Number of teaching and non-teaching staff.', 'multiline' => true],
        'awards_accolades' => ['label' => 'Awards & Accolades', 'description' => 'Major awards, recognitions and achievements of the school.', 'multiline' => true],
    ];

    public function adminIndex(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        return Inertia::render('dashboard/CbseDisclosure', [
            'user' => $user,
            'disclosure' => $this->disclosureForOrganization($organization),
            'sectionOptions' => collect(self::DEFAULT_SECTIONS)->map(fn (array $meta, string $key) => [
                'key' => $key,
                'label' => $meta['label'],
                'description' => $meta['description'],
                'multiline' => $meta['multiline'],
            ])->values(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $sections = collect(self::DEFAULT_SECTIONS)->keys()->mapWithKeys(function (string $key) use ($request) {
            $value = $request->input("sections.$key");

            return [$key => $value === null ? '' : (string) $value];
        })->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'cbse_disclosure' => $sections,
            ],
        ]);

        return back()->with('success', 'CBSE disclosure updated successfully.');
    }

    public function publicDisplay()
    {
        $organization = app(ActiveOrgResolver::class)->resolvePublicOrganization();

        return Inertia::render('CbseDisclosure', [
            'websiteContent' => $this->publicWebsiteContent($organization),
            'disclosure' => $this->disclosureForOrganization($organization),
            'sectionOptions' => collect(self::DEFAULT_SECTIONS)->map(fn (array $meta, string $key) => [
                'key' => $key,
                'label' => $meta['label'],
            ])->values(),
        ]);
    }

    private function disclosureForOrganization(Organization $organization): array
    {
        $stored = $organization->settings['cbse_disclosure'] ?? [];

        return collect(self::DEFAULT_SECTIONS)->mapWithKeys(function (array $meta, string $key) use ($stored) {
            return [$key => (string) ($stored[$key] ?? '')];
        })->all();
    }

    private function publicWebsiteContent(?Organization $organization): ?array
    {
        if (! $organization) {
            return null;
        }

        $settings = \App\Models\WebsiteSetting::where('organization_id', $organization->id)->get();
        $content = [];
        $shared = [];
        $templates = [];

        foreach ($settings as $setting) {
            $value = $setting->value;
            if ($value !== null && in_array($setting->key, ['sliderImages'])) {
                $decoded = json_decode($value, true);
                $content[$setting->key] = is_array($decoded) ? $decoded : [];
                continue;
            }
            if ($setting->group === 'meta') {
                $decoded = json_decode($value, true);
                $content[$setting->key] = is_array($decoded) ? $decoded : $value;
            } elseif ($setting->group === 'shared') {
                $decoded = json_decode($value, true);
                $shared[$setting->key] = is_array($decoded) ? $decoded : $value;
            } elseif (str_starts_with($setting->group, 'template')) {
                $decoded = json_decode($value, true);
                $templates[$setting->group][$setting->key] = is_array($decoded) ? $decoded : $value;
            }
        }
        $content['shared'] = $shared;
        foreach ($templates as $group => $data) {
            $content[$group] = $data;
        }

        return [
            ...$content,
            'brandLogo' => $organization->logo,
            'schoolName' => $organization->name,
            'shared' => [
                ...($content['shared'] ?? []),
                'brandLogo' => $organization->logo,
                'schoolName' => $organization->name,
            ],
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