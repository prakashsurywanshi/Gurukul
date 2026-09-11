<?php

namespace App\Http\Controllers;

use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class CustomFieldsController extends Controller
{
    private const ENTITIES = ['student', 'staff'];

    private const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $definitions = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->orderBy('entity')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->groupBy('entity');

        $entityDefinitions = collect(self::ENTITIES)->map(fn (string $entity) => [
            'entity' => $entity,
            'fields' => $definitions->get($entity, collect())->map(fn (CustomFieldDefinition $field) => [
                'id' => $field->id,
                'label' => $field->label,
                'fieldKey' => $field->field_key,
                'fieldType' => $field->field_type,
                'options' => $field->options ?? [],
                'isRequired' => $field->is_required,
                'isActive' => $field->is_active,
                'showInAdmission' => $field->show_in_admission,
                'sortOrder' => $field->sort_order,
            ])->values(),
        ])->values();

        $records = collect(self::ENTITIES)->map(function (string $entity) use ($organization, $definitions) {
            $fields = $definitions->get($entity, collect());
            $activeFields = $fields->where('is_active', true);

            [$rows] = $this->entityRows($entity, $organization);

            $valueRows = CustomFieldValue::query()
                ->where('organization_id', $organization->id)
                ->where('entity', $entity)
                ->whereIn('entity_id', $rows->pluck('id')->all() ?: [0])
                ->get(['entity_id', 'field_id', 'value']);

            $valuesByRecord = $valueRows->groupBy('entity_id');

            $records = $rows->map(function ($row) use ($entity, $valuesByRecord, $activeFields) {
                $rowValues = $valuesByRecord->get($row->id, collect());
                $values = [];

                foreach ($activeFields as $field) {
                    $match = $rowValues->firstWhere('field_id', $field->id);
                    $values[$field->field_key] = $match?->value;
                }

                $requiredMissing = $activeFields
                    ->where('is_required', true)
                    ->filter(fn (CustomFieldDefinition $field) => blank($values[$field->field_key]))
                    ->count();

                $name = $entity === 'student'
                    ? trim(($row->first_name ?? '').' '.($row->last_name ?? ''))
                    : ($row->name ?? '');

                return [
                    'entityId' => $row->id,
                    'name' => $name,
                    'admissionNo' => $entity === 'student' ? $row->admission_no : null,
                    'secondary' => $entity === 'student' ? $row->admission_no : ucfirst((string) $row->role),
                    'values' => $values,
                    'filledCount' => collect($values)->filter(fn ($value) => filled($value))->count(),
                    'requiredMissing' => $requiredMissing,
                    'complete' => $activeFields->where('is_required', true)->count() === 0 || $requiredMissing === 0,
                ];
            })->values();

            return [
                'entity' => $entity,
                'records' => $records,
                'totalFields' => $activeFields->count(),
                'requiredFields' => $activeFields->where('is_required', true)->count(),
            ];
        })->values();

        $studentRecords = $records->firstWhere('entity', 'student');
        $staffRecords = $records->firstWhere('entity', 'staff');

        return Inertia::render('dashboard/CustomFields', [
            'user' => $user,
            'definitions' => $entityDefinitions,
            'records' => $records,
            'summary' => [
                'totalDefinitions' => $definitions->flatten(1)->count(),
                'activeDefinitions' => $definitions->flatten(1)->where('is_active', true)->count(),
                'studentRecords' => $studentRecords['records']->count(),
                'staffRecords' => $staffRecords['records']->count(),
                'entityEntities' => self::ENTITIES,
            ],
        ]);
    }

    public function storeDefinition(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'entity' => ['required', Rule::in(self::ENTITIES)],
            'label' => ['required', 'string', 'max:191'],
            'field_type' => ['required', Rule::in(self::FIELD_TYPES)],
            'options' => ['nullable', 'array'],
            'options.*' => ['required', 'string', 'max:191'],
            'is_required' => ['boolean'],
            'is_active' => ['boolean'],
            'show_in_admission' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $key = Str::slug($validated['label'], '_');

        if (blank($key)) {
            $key = 'field_'.Str::lower(Str::random(6));
        }

        abort_if(
            CustomFieldDefinition::query()
                ->where('organization_id', $organization->id)
                ->where('entity', $validated['entity'])
                ->where('field_key', $key)
                ->exists(),
            422,
            'A field with this name already exists.'
        );

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => $validated['entity'],
            'label' => $validated['label'],
            'field_key' => $key,
            'field_type' => $validated['field_type'],
            'options' => $validated['field_type'] === 'select' ? ($validated['options'] ?? []) : null,
            'is_required' => $validated['is_required'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'show_in_admission' => $validated['show_in_admission'] ?? false,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Custom field created.');
    }

    public function updateDefinition(Request $request, CustomFieldDefinition $field): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($field->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'options' => ['nullable', 'array'],
            'options.*' => ['required', 'string', 'max:191'],
            'is_required' => ['boolean'],
            'is_active' => ['boolean'],
            'show_in_admission' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $field->update([
            'options' => $field->field_type === 'select' ? ($validated['options'] ?? []) : null,
            'is_required' => $validated['is_required'] ?? $field->is_required,
            'is_active' => $validated['is_active'] ?? $field->is_active,
            'show_in_admission' => $validated['show_in_admission'] ?? $field->show_in_admission,
            'sort_order' => $validated['sort_order'] ?? $field->sort_order,
        ]);

        return back()->with('success', 'Custom field updated.');
    }

    public function destroyDefinition(Request $request, CustomFieldDefinition $field): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($field->organization_id === $organization->id, 404);

        $field->delete();

        return back()->with('success', 'Custom field removed.');
    }

    public function storeValues(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'entity' => ['required', Rule::in(self::ENTITIES)],
            'entity_id' => ['required', 'integer'],
            'values' => ['array'],
        ]);

        $fields = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', $validated['entity'])
            ->where('is_active', true)
            ->get();

        [$rows] = $this->entityRows($validated['entity'], $organization);
        abort_unless($rows->where('id', $validated['entity_id'])->isNotEmpty(), 404);

        $errors = [];
        $normalized = [];

        foreach ($fields as $field) {
            $input = $validated['values'][$field->field_key] ?? null;
            $input = is_array($input) ? null : $input;

            if ($field->is_required && blank($input)) {
                $errors['values.'.$field->field_key] = 'The '.$field->label.' field is required.';
            }

            if (filled($input) && ! $this->valueIsValid($field, $input)) {
                $errors['values.'.$field->field_key] = 'The '.$field->label.' field is invalid.';
            }

            $normalized[$field->id] = filled($input) ? $this->normalizeValue($field, $input) : null;
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        foreach ($normalized as $fieldId => $value) {
            CustomFieldValue::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'entity' => $validated['entity'],
                    'entity_id' => $validated['entity_id'],
                    'field_id' => $fieldId,
                ],
                ['value' => $value]
            );
        }

        return back()->with('success', 'Custom field values saved.');
    }

    private function entityRows(string $entity, Organization $organization): array
    {
        if ($entity === 'staff') {
            $rows = User::query()
                ->where('organization_id', $organization->id)
                ->whereNotNull('role')
                ->where('role', '!=', 'student')
                ->orderBy('name')
                ->get(['id', 'name', 'role']);

            return [$rows, 'name', 'role'];
        }

        $rows = Student::query()
            ->where('organization_id', $organization->id)
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'admission_no', 'class_id']);

        return [$rows, 'student_name', 'admission_no'];
    }

    private function valueIsValid(CustomFieldDefinition $field, string $input): bool
    {
        return match ($field->field_type) {
            'number' => is_numeric($input),
            'date' => (bool) strtotime($input),
            'select' => in_array($input, $field->options ?? [], true),
            default => true,
        };
    }

    private function normalizeValue(CustomFieldDefinition $field, string $input): string
    {
        return match ($field->field_type) {
            'number' => (string) ((float) $input),
            'date' => date('Y-m-d', strtotime($input)),
            default => $input,
        };
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