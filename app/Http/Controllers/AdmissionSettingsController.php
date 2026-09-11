<?php

namespace App\Http\Controllers;

use App\Models\CustomFieldDefinition;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdmissionSettingsController extends Controller
{
    private const DEFAULT_SECTIONS = [
        'basic' => ['label' => 'Basic Information', 'description' => 'Student name, date of birth, gender, religion, and category fields.'],
        'contact' => ['label' => 'Contact Information', 'description' => 'Student phone, email, address and location details.'],
        'guardian' => ['label' => 'Guardian Information', 'description' => 'Father, mother and guardian details shown on the admission form.'],
        'previous_school' => ['label' => 'Previous School', 'description' => 'Previous school details and leaving certificate information.'],
        'documents' => ['label' => 'Documents', 'description' => 'Student photo and required document attachments.'],
    ];

    private const DEFAULT_SETTINGS = [
        'enable_public_form' => true,
        'require_verification' => true,
        'require_documents' => false,
        'sections' => [
            'basic' => true,
            'contact' => true,
            'guardian' => true,
            'previous_school' => true,
            'documents' => true,
        ],
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $settings = $this->normalizeSettings($organization);

        $customFields = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (CustomFieldDefinition $field) => [
                'id' => $field->id,
                'label' => $field->label,
                'fieldType' => $field->field_type,
                'isRequired' => $field->is_required,
                'isActive' => $field->is_active,
                'showInAdmission' => $field->show_in_admission,
            ])
            ->values();

        return inertia('dashboard/AdmissionSettings', [
            'user' => $user,
            'settings' => $settings,
            'customFields' => $customFields,
            'sectionOptions' => collect(self::DEFAULT_SECTIONS)->map(fn (array $meta, string $key) => [
                'key' => $key,
                'label' => $meta['label'],
                'description' => $meta['description'],
            ])->values(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'enable_public_form' => ['required', 'boolean'],
            'require_verification' => ['required', 'boolean'],
            'require_documents' => ['required', 'boolean'],
            'sections' => ['required', 'array'],
            'sections.*' => ['required', 'boolean'],
            'customFieldIds' => ['nullable', 'array'],
            'customFieldIds.*' => ['integer'],
        ]);

        $sectionKeys = array_keys(self::DEFAULT_SECTIONS);
        $sections = $validated['sections'] ?? [];
        $normalizedSections = [];
        foreach ($sectionKeys as $key) {
            $normalizedSections[$key] = (bool) ($sections[$key] ?? false);
        }

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'admission_settings' => [
                    'enable_public_form' => (bool) $validated['enable_public_form'],
                    'require_verification' => (bool) $validated['require_verification'],
                    'require_documents' => (bool) $validated['require_documents'],
                    'sections' => $normalizedSections,
                ],
            ],
        ]);

        $fieldIds = collect($validated['customFieldIds'] ?? [])
            ->filter(fn ($id) => is_int($id) || ctype_digit((string) $id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->get()
            ->each(function (CustomFieldDefinition $field) use ($fieldIds) {
                $field->update([
                    'show_in_admission' => in_array($field->id, $fieldIds, true),
                ]);
            });

        return back()->with('success', 'Admission settings saved successfully.');
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

    private function normalizeSettings(Organization $organization): array
    {
        $stored = $organization->settings['admission_settings'] ?? [];

        return [
            'enable_public_form' => (bool) ($stored['enable_public_form'] ?? self::DEFAULT_SETTINGS['enable_public_form']),
            'require_verification' => (bool) ($stored['require_verification'] ?? self::DEFAULT_SETTINGS['require_verification']),
            'require_documents' => (bool) ($stored['require_documents'] ?? self::DEFAULT_SETTINGS['require_documents']),
            'sections' => collect(self::DEFAULT_SETTINGS['sections'])->mapWithKeys(fn (bool $enabled, string $key) => [
                $key => (bool) ($stored['sections'][$key] ?? $enabled),
            ])->all(),
        ];
    }
}