<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\InventoryItem;
use App\Models\Lead;
use App\Models\LibraryBook;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\CustomFieldValueService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class CustomFieldsController extends Controller
{
    private array $entities;
    private array $fieldTypes;

    public function __construct(
        private readonly CustomFieldValueService $fieldValueService
    ) {
        $this->entities = CustomFieldValueService::ENTITIES;
        $this->fieldTypes = CustomFieldValueService::FIELD_TYPES;
    }

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

        $entityDefinitions = collect($this->entities)->map(fn (string $entity) => [
            'entity' => $entity,
            'fields' => $definitions->get($entity, collect())->map(fn (CustomFieldDefinition $field) => [
                'id' => $field->id,
                'label' => $field->label,
                'fieldKey' => $field->field_key,
                'fieldType' => $field->field_type,
                'options' => $field->options ?? [],
                'pattern' => $field->pattern,
                'patternMessage' => $field->pattern_message,
                'minValue' => $field->min_value !== null ? (float) $field->min_value : null,
                'maxValue' => $field->max_value !== null ? (float) $field->max_value : null,
                'minLength' => $field->min_length,
                'maxLength' => $field->max_length,
                'isRequired' => $field->is_required,
                'isActive' => $field->is_active,
                'showInAdmission' => $field->show_in_admission,
                'sortOrder' => $field->sort_order,
            ])->values(),
        ])->values();

        $entityDisplayNames = $this->entityDisplayNames();

        $records = collect($this->entities)->map(function (string $entity) use ($organization, $definitions, $entityDisplayNames) {
            $fields = $definitions->get($entity, collect());
            $activeFields = $fields->where('is_active', true);

            [$rows, $nameKeys, $secondaryKey] = $this->entityRows($entity, $organization);

            $valueRows = CustomFieldValue::query()
                ->where('organization_id', $organization->id)
                ->where('entity', $entity)
                ->whereIn('entity_id', $rows->pluck('id')->all() ?: [0])
                ->get(['entity_id', 'field_id', 'value']);

            $valuesByRecord = $valueRows->groupBy('entity_id');

            $records = $rows->map(function ($row) use ($entity, $valuesByRecord, $activeFields, $nameKeys, $secondaryKey) {
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

                return [
                    'entityId' => $row->id,
                    'name' => $this->displayName($entity, $row, $nameKeys),
                    'admissionNo' => $entity === 'student' ? $row->admission_no : null,
                    'secondary' => $this->secondaryText($entity, $row, $secondaryKey),
                    'values' => $values,
                    'filledCount' => collect($values)->filter(fn ($value) => filled($value))->count(),
                    'requiredMissing' => $requiredMissing,
                    'complete' => $activeFields->where('is_required', true)->count() === 0 || $requiredMissing === 0,
                ];
            })->values();

            return [
                'entity' => $entity,
                'label' => $entityDisplayNames[$entity],
                'records' => $records,
                'totalFields' => $activeFields->count(),
                'requiredFields' => $activeFields->where('is_required', true)->count(),
            ];
        })->values();

        $countsByEntity = collect($this->entities)->mapWithKeys(function (string $entity) use ($records) {
            return [$entity => $records->firstWhere('entity', $entity)['records']->count()];
        });

        return Inertia::render('dashboard/CustomFields', [
            'user' => $user,
            'definitions' => $entityDefinitions,
            'records' => $records,
            'summary' => [
                'totalDefinitions' => $definitions->flatten(1)->count(),
                'activeDefinitions' => $definitions->flatten(1)->where('is_active', true)->count(),
                'recordCounts' => $countsByEntity,
                'entityEntities' => $this->entities,
                'entityLabels' => $entityDisplayNames,
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
            'entity' => ['required', Rule::in($this->entities)],
            'label' => ['required', 'string', 'max:191'],
            'field_type' => ['required', Rule::in($this->fieldTypes)],
            'options' => ['nullable', 'array'],
            'options.*' => ['required', 'string', 'max:191'],
            'pattern' => ['nullable', 'string', 'max:255'],
            'pattern_message' => ['nullable', 'string', 'max:255'],
            'min_value' => ['nullable', 'numeric'],
            'max_value' => ['nullable', 'numeric'],
            'min_length' => ['nullable', 'integer', 'min:0'],
            'max_length' => ['nullable', 'integer', 'min:0'],
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
            'options' => in_array($validated['field_type'], CustomFieldValueService::OPTIONED_TYPES, true)
                ? ($validated['options'] ?? [])
                : null,
            'pattern' => $this->nullable($validated['pattern'] ?? null),
            'pattern_message' => $this->nullable($validated['pattern_message'] ?? null),
            'min_value' => $this->nullable($validated['min_value'] ?? null),
            'max_value' => $this->nullable($validated['max_value'] ?? null),
            'min_length' => $this->nullable($validated['min_length'] ?? null),
            'max_length' => $this->nullable($validated['max_length'] ?? null),
            'is_required' => (bool) ($validated['is_required'] ?? false),
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'show_in_admission' => (bool) ($validated['show_in_admission'] ?? false),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
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
            'pattern' => ['nullable', 'string', 'max:255'],
            'pattern_message' => ['nullable', 'string', 'max:255'],
            'min_value' => ['nullable', 'numeric'],
            'max_value' => ['nullable', 'numeric'],
            'min_length' => ['nullable', 'integer', 'min:0'],
            'max_length' => ['nullable', 'integer', 'min:0'],
            'is_required' => ['boolean'],
            'is_active' => ['boolean'],
            'show_in_admission' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $field->update([
            'options' => in_array($field->field_type, CustomFieldValueService::OPTIONED_TYPES, true)
                ? ($validated['options'] ?? [])
                : null,
            'pattern' => $this->nullable($validated['pattern'] ?? null),
            'pattern_message' => $this->nullable($validated['pattern_message'] ?? null),
            'min_value' => $this->nullable($validated['min_value'] ?? null),
            'max_value' => $this->nullable($validated['max_value'] ?? null),
            'min_length' => $this->nullable($validated['min_length'] ?? null),
            'max_length' => $this->nullable($validated['max_length'] ?? null),
            'is_required' => (bool) ($validated['is_required'] ?? $field->is_required),
            'is_active' => (bool) ($validated['is_active'] ?? $field->is_active),
            'show_in_admission' => (bool) ($validated['show_in_admission'] ?? $field->show_in_admission),
            'sort_order' => (int) ($validated['sort_order'] ?? $field->sort_order),
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
            'entity' => ['required', Rule::in($this->entities)],
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

        $result = $this->fieldValueService->validateForFields($fields, $validated['values'] ?? []);

        if ($result['errors']) {
            throw ValidationException::withMessages($result['errors']);
        }

        foreach ($result['normalized'] as $fieldId => $value) {
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

    /**
     * @return array{0: EloquentCollection<int, \stdClass|User|Student>, 1: string[], 2: ?string}
     */
    private function entityRows(string $entity, Organization $organization): array
    {
        return match ($entity) {
            'staff' => [
                User::query()
                    ->where('organization_id', $organization->id)
                    ->whereNotNull('role')
                    ->where('role', '!=', 'student')
                    ->orderBy('name')
                    ->get(['id', 'name', 'role']),
                ['name'],
                'role',
            ],
            'lead' => [
                Lead::query()
                    ->where('organization_id', $organization->id)
                    ->orderBy('student_name')
                    ->get(['id', 'student_name', 'phone', 'email']),
                ['student_name', 'parent_name'],
                'phone',
            ],
            'book' => [
                LibraryBook::query()
                    ->where('organization_id', $organization->id)
                    ->orderBy('title')
                    ->get(['id', 'title', 'author', 'book_number']),
                ['title'],
                'author',
            ],
            'asset' => [
                Asset::query()
                    ->where('organization_id', $organization->id)
                    ->orderBy('name')
                    ->get(['id', 'name', 'asset_code']),
                ['name'],
                'asset_code',
            ],
            'inventory' => [
                InventoryItem::query()
                    ->where('organization_id', $organization->id)
                    ->orderBy('name')
                    ->get(['id', 'name', 'unit', 'available_stock']),
                ['name'],
                'unit',
            ],
            default => [
                Student::query()
                    ->where('organization_id', $organization->id)
                    ->orderBy('first_name')
                    ->get(['id', 'first_name', 'last_name', 'admission_no', 'class_id']),
                ['first_name', 'last_name'],
                'admission_no',
            ],
        };
    }

    private function displayName(string $entity, $row, array $nameKeys): string
    {
        if ($entity === 'student') {
            return trim(($row->first_name ?? '').' '.($row->last_name ?? ''));
        }

        $parts = [];
        foreach ($nameKeys as $key) {
            if (! blank($row->{$key} ?? null)) {
                $parts[] = (string) $row->{$key};
            }
        }

        return $parts !== [] ? implode(' ', $parts) : (string) $row->id;
    }

    private function secondaryText(string $entity, $row, ?string $key): ?string
    {
        if (! $key) {
            return null;
        }

        if ($entity === 'staff') {
            return ucfirst((string) $row->role);
        }

        $value = $row->{$key} ?? null;

        return blank($value) ? null : (string) $value;
    }

    private function entityDisplayNames(): array
    {
        return [
            'student' => 'Students',
            'staff' => 'Staff',
            'lead' => 'Leads',
            'book' => 'Books',
            'asset' => 'Assets',
            'inventory' => 'Inventory',
        ];
    }

    private function nullable($value)
    {
        return blank($value) ? null : $value;
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

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}