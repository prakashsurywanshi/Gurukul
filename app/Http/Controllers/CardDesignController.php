<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CardDesignController extends Controller
{
    private const DEFAULT_DESIGN = [
        'layout' => 'landscape',
        'primary_color' => '#1d4ed8',
        'show_photo' => true,
        'show_admission_no' => true,
        'show_qr' => true,
        'show_guardian' => true,
        'show_blood_group' => false,
        'show_dob' => true,
    ];

    private const LAYOUTS = ['landscape', 'portrait'];

    private const FIELDS = [
        'layout' => 'string',
        'primary_color' => 'string',
        'show_photo' => 'boolean',
        'show_admission_no' => 'boolean',
        'show_qr' => 'boolean',
        'show_guardian' => 'boolean',
        'show_blood_group' => 'boolean',
        'show_dob' => 'boolean',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        return Inertia::render('dashboard/CardDesigns', [
            'user' => $user,
            'design' => $this->normalize($organization),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $rules = [];
        foreach (self::FIELDS as $key => $type) {
            $rules[$key] = $type === 'boolean' ? ['nullable', 'boolean'] : ['nullable', 'string', 'max:60'];
        }

        $validated = $request->validate($rules);

        $design = [];
        foreach (self::FIELDS as $key => $type) {
            $design[$key] = $type === 'boolean'
                ? (bool) ($validated[$key] ?? false)
                : trim((string) ($validated[$key] ?? (self::DEFAULT_DESIGN[$key] ?? '')));
        }

        if (! in_array($design['layout'], self::LAYOUTS, true)) {
            $design['layout'] = 'landscape';
        }

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'id_card_design' => $design,
            ],
        ]);

        return redirect()->route('card-designs')->with('success', 'ID card design saved.');
    }

    private function normalize(Organization $organization): array
    {
        $stored = is_array($organization->settings['id_card_design'] ?? null)
            ? $organization->settings['id_card_design']
            : [];

        $design = [];
        foreach (self::FIELDS as $key => $type) {
            $design[$key] = $type === 'boolean'
                ? (bool) ($stored[$key] ?? self::DEFAULT_DESIGN[$key])
                : trim((string) ($stored[$key] ?? self::DEFAULT_DESIGN[$key]));
        }

        return $design;
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}