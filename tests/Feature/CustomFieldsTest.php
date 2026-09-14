<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AdmissionInquiry;
use App\Models\Asset;
use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use App\Models\Lead;
use App\Models\LibraryBook;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CustomFieldsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'UTC']);
        date_default_timezone_set('UTC');
    }

    public function test_admin_can_manage_custom_field_definitions(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/custom-fields')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CustomFields')
                ->where('summary.totalDefinitions', 0)
                ->has('definitions', 6)
            );

        $this->actingAs($admin)->post('/custom-fields/definitions', [
            'entity' => 'student',
            'label' => 'Blood Group',
            'field_type' => 'select',
            'options' => ['A+', 'A-', 'B+', 'O+'],
            'is_required' => true,
            'show_in_admission' => true,
        ])->assertRedirect();

        $field = CustomFieldDefinition::query()->where('organization_id', $organization->id)->where('field_key', 'blood_group')->first();
        $this->assertNotNull($field);
        $this->assertTrue($field->is_required);
        $this->assertSame(['A+', 'A-', 'B+', 'O+'], $field->options);
        $this->assertTrue($field->show_in_admission);

        $this->actingAs($admin)->post('/custom-fields/definitions', [
            'entity' => 'staff',
            'label' => 'Emergency Contact',
            'field_type' => 'text',
        ])->assertRedirect();

        $staffField = CustomFieldDefinition::query()->where('organization_id', $organization->id)->where('entity', 'staff')->first();
        $this->assertNotNull($staffField);
        $this->assertSame('emergency_contact', $staffField->field_key);

        $this->actingAs($admin)
            ->get('/custom-fields')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.totalDefinitions', 2)
                ->where('summary.activeDefinitions', 2)
                ->where('definitions.0.entity', 'student')
                ->where('definitions.0.fields.0.label', 'Blood Group')
                ->where('definitions.1.entity', 'staff')
            );

        $this->actingAs($admin)->patch("/custom-fields/definitions/{$field->id}", [
            'is_required' => false,
        ])->assertRedirect();
        $this->assertFalse($field->fresh()->is_required);

        $this->actingAs($admin)->patch("/custom-fields/definitions/{$staffField->id}", [
            'is_active' => false,
        ])->assertRedirect();
        $this->assertFalse($staffField->fresh()->is_active);

        $this->actingAs($admin)->delete("/custom-fields/definitions/{$staffField->id}")->assertRedirect();
        $this->assertNull($staffField->fresh());
    }

    public function test_duplicate_field_key_is_rejected(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)->post('/custom-fields/definitions', [
            'entity' => 'student',
            'label' => 'Blood Group',
            'field_type' => 'text',
        ])->assertRedirect();

        $this->actingAs($admin)->post('/custom-fields/definitions', [
            'entity' => 'student',
            'label' => 'Blood Group',
            'field_type' => 'text',
        ])->assertStatus(422);

        $this->assertSame(1, CustomFieldDefinition::query()->where('organization_id', $organization->id)->count());
    }

    public function test_admin_can_save_and_update_custom_field_values(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $field = CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Blood Group',
            'field_key' => 'blood_group',
            'field_type' => 'select',
            'options' => ['A+', 'A-', 'B+', 'O+'],
            'is_required' => true,
            'is_active' => true,
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-CF-'.$organization->id,
            'first_name' => 'Varun',
            'last_name' => 'Jadhav',
            'date_of_birth' => '2013-07-19',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => ['blood_group' => 'O+'],
        ])->assertRedirect();

        $value = CustomFieldValue::query()->where('field_id', $field->id)->first();
        $this->assertNotNull($value);
        $this->assertSame('O+', $value->value);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => ['blood_group' => 'A+'],
        ])->assertRedirect();

        $this->assertSame(1, CustomFieldValue::query()->where('field_id', $field->id)->count());
        $this->assertSame('A+', $value->fresh()->value);

        $this->actingAs($admin)
            ->get('/custom-fields')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.recordCounts.student', 1)
                ->where('records.0.records.0.name', 'Varun Jadhav')
                ->where('records.0.records.0.values.blood_group', 'A+')
                ->where('records.0.records.0.filledCount', 1)
                ->where('records.0.records.0.requiredMissing', 0)
                ->where('records.0.records.0.complete', true)
            );
    }

    public function test_required_and_type_validation_for_values(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Blood Group',
            'field_key' => 'blood_group',
            'field_type' => 'select',
            'options' => ['A+', 'O+'],
            'is_required' => true,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Height (cm)',
            'field_key' => 'height_cm',
            'field_type' => 'number',
            'options' => null,
            'is_required' => false,
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-CF-VALID',
            'first_name' => 'Meera',
            'last_name' => 'Patel',
            'date_of_birth' => '2014-01-05',
            'gender' => 'female',
            'admission_date' => now()->toDateString(),
        ]);

        $payload = ['entity' => 'student', 'entity_id' => $student->id, 'values' => ['height_cm' => 'abc']];

        $this->actingAs($admin)->post('/custom-fields/values', $payload)->assertSessionHasErrors('values.blood_group');
        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => ['blood_group' => 'A-', 'height_cm' => 'abc'],
        ])->assertSessionHasErrors(['values.blood_group', 'values.height_cm']);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => ['blood_group' => 'A+', 'height_cm' => '152.5'],
        ])->assertRedirect();

        $this->assertSame('A+', CustomFieldValue::query()->whereNotNull('value')->whereHas('field', fn ($query) => $query->where('field_key', 'blood_group'))->value('value'));
        $this->assertSame('152.5', CustomFieldValue::query()->whereHas('field', fn ($query) => $query->where('field_key', 'height_cm'))->value('value'));
    }

    public function test_custom_field_records_are_scoped_to_organization(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);
        app(StaffPermissionService::class)->ensureRolesExist($organizationB);
        $adminA = $this->createUser($organizationA, 'admin');
        $adminB = $this->createUser($organizationB, 'admin');

        $fieldB = CustomFieldDefinition::query()->create([
            'organization_id' => $organizationB->id,
            'entity' => 'student',
            'label' => 'Private Field',
            'field_key' => 'private_field',
            'field_type' => 'text',
            'is_active' => true,
        ]);

        $studentB = Student::query()->create([
            'organization_id' => $organizationB->id,
            'admission_no' => 'ADM-CF-B',
            'first_name' => 'Other',
            'last_name' => 'School',
            'date_of_birth' => '2015-04-04',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        $this->actingAs($adminA)->delete("/custom-fields/definitions/{$fieldB->id}")->assertNotFound();
        $this->actingAs($adminA)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $studentB->id,
            'values' => ['private_field' => 'x'],
        ])->assertNotFound();

        $this->assertNotNull($fieldB->fresh());

        $this->actingAs($adminA)
            ->get('/custom-fields')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.totalDefinitions', 0)
                ->where('summary.recordCounts.student', 0)
            );
    }

    public function test_custom_fields_reject_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)->get('/custom-fields')->assertForbidden();
    }

    public function test_student_admission_form_exposes_admission_custom_fields(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Minibus Route',
            'field_key' => 'minibus_route',
            'field_type' => 'select',
            'options' => ['S1', 'S2', 'S3'],
            'is_required' => true,
            'show_in_admission' => true,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Aadhaar Number',
            'field_key' => 'aadhaar_number',
            'field_type' => 'number',
            'is_required' => false,
            'show_in_admission' => true,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Internal Note',
            'field_key' => 'internal_note',
            'field_type' => 'text',
            'is_required' => false,
            'show_in_admission' => false,
        ]);

        $this->actingAs($admin)
            ->get('/students/create')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/students/CreateStudent')
                ->has('admissionCustomFields', 2)
                ->where('admissionCustomFields.0.fieldKey', 'minibus_route')
                ->where('admissionCustomFields.1.fieldKey', 'aadhaar_number')
            );
    }

    public function test_student_store_saves_admission_custom_field_values(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $class = $this->createClass($organization);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Minibus Route',
            'field_key' => 'minibus_route',
            'field_type' => 'select',
            'options' => ['S1', 'S2', 'S3'],
            'is_required' => true,
            'show_in_admission' => true,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Aadhaar Number',
            'field_key' => 'aadhaar_number',
            'field_type' => 'number',
            'is_required' => false,
            'show_in_admission' => true,
            'sort_order' => 1,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Internal Note',
            'field_key' => 'internal_note',
            'field_type' => 'text',
            'show_in_admission' => false,
        ]);

        $this->actingAs($admin)->post('/students', [
            'first_name' => 'Ananya',
            'middle_name' => 'Shrikant',
            'last_name' => 'Kulkarni',
            'first_name_mr' => 'अनन्या',
            'middle_name_mr' => 'श्रीकांत',
            'last_name_mr' => 'कुलकर्णी',
            'date_of_birth' => '2013-08-12',
            'gender' => 'female',
            'class' => $class->name,
            'section' => $class->section,
            'admission_date' => '2026-06-01',
            'custom_fields' => [
                'minibus_route' => 'S2',
                'aadhaar_number' => '123456789012',
                'internal_note' => 'should be ignored',
            ],
        ])->assertRedirect();

        $student = Student::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($student);

        $minibusField = CustomFieldDefinition::query()->where('field_key', 'minibus_route')->first();
        $aadhaarField = CustomFieldDefinition::query()->where('field_key', 'aadhaar_number')->first();
        $internalField = CustomFieldDefinition::query()->where('field_key', 'internal_note')->first();

        $this->assertSame('S2', CustomFieldValue::query()->where('field_id', $minibusField->id)->where('entity_id', $student->id)->value('value'));
        $this->assertSame('123456789012', CustomFieldValue::query()->where('field_id', $aadhaarField->id)->where('entity_id', $student->id)->value('value'));
        $this->assertNull(CustomFieldValue::query()->where('field_id', $internalField->id)->first());
    }

    public function test_student_store_validates_required_admission_custom_fields(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $class = $this->createClass($organization);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Minibus Route',
            'field_key' => 'minibus_route',
            'field_type' => 'select',
            'options' => ['S1', 'S2', 'S3'],
            'is_required' => true,
            'show_in_admission' => true,
        ]);

        $basePayload = [
            'first_name' => 'Ananya',
            'middle_name' => 'Shrikant',
            'last_name' => 'Kulkarni',
            'first_name_mr' => 'अनन्या',
            'middle_name_mr' => 'श्रीकांत',
            'last_name_mr' => 'कुलकर्णी',
            'date_of_birth' => '2013-08-12',
            'gender' => 'female',
            'class' => $class->name,
            'section' => $class->section,
            'admission_date' => '2026-06-01',
        ];

        $this->actingAs($admin)->post('/students', $basePayload)->assertSessionHasErrors('custom_fields.minibus_route');
        $this->actingAs($admin)->post('/students', $basePayload + [
            'custom_fields' => ['minibus_route' => 'S9'],
        ])->assertSessionHasErrors('custom_fields.minibus_route');

        $this->actingAs($admin)->post('/students', $basePayload + [
            'custom_fields' => ['minibus_route' => 'S3'],
        ])->assertRedirect();

        $this->assertSame('S3', CustomFieldValue::query()->whereNotNull('value')->whereHas('field', fn ($query) => $query->where('field_key', 'minibus_route'))->value('value'));
    }

    public function test_student_update_updates_admission_custom_field_values(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $class = $this->createClass($organization);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-CF-EDIT',
            'first_name' => 'Rohan',
            'last_name' => 'Deshmukh',
            'date_of_birth' => '2012-03-21',
            'gender' => 'male',
            'admission_date' => '2026-06-01',
        ]);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Aadhaar Number',
            'field_key' => 'aadhaar_number',
            'field_type' => 'number',
            'is_required' => false,
            'show_in_admission' => true,
        ]);

        $this->actingAs($admin)
            ->get("/students/{$student->id}/edit")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/students/EditStudent')
                ->has('admissionCustomFields', 1)
                ->where('admissionCustomFieldValues.aadhaar_number', null)
            );

        $this->actingAs($admin)->patch("/students/{$student->id}", [
            'first_name' => 'Rohan',
            'middle_name' => 'Vijay',
            'last_name' => 'Deshmukh',
            'first_name_mr' => 'रोहन',
            'middle_name_mr' => 'विजय',
            'last_name_mr' => 'देशमुख',
            'date_of_birth' => '2012-03-21',
            'gender' => 'male',
            'class' => $class->name,
            'section' => $class->section,
            'admission_date' => '2026-06-01',
            'custom_fields' => ['aadhaar_number' => '987654321098'],
        ])->assertRedirect();

        $field = CustomFieldDefinition::query()->where('field_key', 'aadhaar_number')->first();
        $this->assertSame('987654321098', CustomFieldValue::query()->where('field_id', $field->id)->where('entity_id', $student->id)->value('value'));

        $this->actingAs($admin)->patch("/students/{$student->id}", [
            'first_name' => 'Rohan',
            'middle_name' => 'Vijay',
            'last_name' => 'Deshmukh',
            'first_name_mr' => 'रोहन',
            'middle_name_mr' => 'विजय',
            'last_name_mr' => 'देशमुख',
            'date_of_birth' => '2012-03-21',
            'gender' => 'male',
            'class' => $class->name,
            'section' => $class->section,
            'admission_date' => '2026-06-01',
            'custom_fields' => ['aadhaar_number' => ''],
        ])->assertRedirect();

        $this->assertNull(CustomFieldValue::query()->where('field_id', $field->id)->where('entity_id', $student->id)->value('value'));
    }

    public function test_new_field_types_are_validated_and_normalized(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-CF-TYPES',
            'first_name' => 'Kabir',
            'last_name' => 'Singh',
            'date_of_birth' => '2014-06-11',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Subjects',
            'field_key' => 'subjects',
            'field_type' => 'multi-select',
            'options' => ['Maths', 'Science', 'English'],
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Transport Used',
            'field_key' => 'transport_used',
            'field_type' => 'checkbox',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Portfolio URL',
            'field_key' => 'portfolio_url',
            'field_type' => 'url',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Guardian Email',
            'field_key' => 'guardian_email',
            'field_type' => 'email',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Guardian Phone',
            'field_key' => 'guardian_phone',
            'field_type' => 'phone',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Tuition Fee',
            'field_key' => 'tuition_fee',
            'field_type' => 'currency',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'ID Document',
            'field_key' => 'id_document',
            'field_type' => 'file',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Joining Date',
            'field_key' => 'joining_date',
            'field_type' => 'date',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Shift',
            'field_key' => 'shift',
            'field_type' => 'radio',
            'options' => ['Morning', 'Evening'],
        ]);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => [
                'subjects' => ['Maths', 'Science'],
                'transport_used' => 'on',
                'portfolio_url' => 'not-a-url',
                'guardian_email' => 'guardian@example.com',
                'guardian_phone' => '+91-98765-43210',
                'tuition_fee' => '1499.50',
                'id_document' => '/uploads/id-card.pdf',
                'joining_date' => '2026-08-15',
                'shift' => 'Night',
            ],
        ])->assertSessionHasErrors(['values.portfolio_url', 'values.shift']);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => [
                'subjects' => ['Maths', 'Science'],
                'transport_used' => 'on',
                'portfolio_url' => 'https://portfolio.example.com/kabir',
                'guardian_email' => 'guardian@example.com',
                'guardian_phone' => '+91-98765-43210',
                'tuition_fee' => '1499.50',
                'id_document' => '/uploads/id-card.pdf',
                'joining_date' => '2026-08-15',
                'shift' => 'Morning',
            ],
        ])->assertRedirect();

        $values = CustomFieldValue::query()->where('entity_id', $student->id)->pluck('value', 'field_id');

        foreach (CustomFieldDefinition::query()->where('entity', 'student')->get() as $field) {
            $this->assertNotNull($values[$field->id] ?? null, 'Expected a stored value for '.$field->field_type);
        }

        $fieldKeys = CustomFieldDefinition::query()->where('entity', 'student')->pluck('id', 'field_key');
        $this->assertSame(
            '["Maths","Science"]',
            $values[$fieldKeys['subjects']]
        );
        $this->assertSame('1', $values[$fieldKeys['transport_used']]);
        $this->assertSame('1499.50', $values[$fieldKeys['tuition_fee']]);
        $this->assertSame('2026-08-15', $values[$fieldKeys['joining_date']]);
    }

    public function test_validation_rules_enforce_pattern_and_boundaries(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-CF-RULES',
            'first_name' => 'Ishaan',
            'last_name' => 'Gupta',
            'date_of_birth' => '2013-11-02',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Aadhaar Number',
            'field_key' => 'aadhaar_number',
            'field_type' => 'number',
            'min_value' => 100000000000,
            'max_value' => 999999999999,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'PAN Number',
            'field_key' => 'pan_number',
            'field_type' => 'text',
            'pattern' => '/^[A-Z]{5}[0-9]{4}[A-Z]$/',
            'pattern_message' => 'PAN must match format ABCDE1234F.',
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Nickname',
            'field_key' => 'nickname',
            'field_type' => 'text',
            'min_length' => 2,
            'max_length' => 10,
        ]);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => [
                'aadhaar_number' => '123',
                'pan_number' => 'abc',
                'nickname' => 'X',
            ],
        ])->assertSessionHasErrors(['values.aadhaar_number', 'values.pan_number', 'values.nickname']);

        $response = $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => [
                'aadhaar_number' => '123',
                'pan_number' => 'abc',
                'nickname' => 'X',
            ],
        ]);

        $panErrors = session('errors')->getBag('default')->get('values.pan_number');
        $this->assertSame('PAN must match format ABCDE1234F.', $panErrors[0] ?? null);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'student',
            'entity_id' => $student->id,
            'values' => [
                'aadhaar_number' => '123456789012',
                'pan_number' => 'ABCDE1234F',
                'nickname' => 'Ishu',
            ],
        ])->assertRedirect();

        $fieldKeys = CustomFieldDefinition::query()->where('entity', 'student')->pluck('id', 'field_key');
        $values = CustomFieldValue::query()->where('entity_id', $student->id)->pluck('value', 'field_id');
        $this->assertSame('123456789012', $values[$fieldKeys['aadhaar_number']]);
        $this->assertSame('ABCDE1234F', $values[$fieldKeys['pan_number']]);
        $this->assertSame('Ishu', $values[$fieldKeys['nickname']]);
    }

    public function test_dashboard_lists_all_entity_records_and_scopes_values(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $this->createUser($organization, 'teacher');

        $lead = Lead::query()->create([
            'organization_id' => $organization->id,
            'student_name' => 'Riya Kapoor',
            'parent_name' => 'Nitin Kapoor',
            'phone' => '9876500001',
            'status' => 'new',
        ]);

        $book = LibraryBook::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Wings of Fire',
            'author' => 'A.P.J. Abdul Kalam',
            'book_number' => 'BK-001',
            'category' => 'Biography',
            'status' => 'active',
        ]);

        $asset = Asset::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Interactive Whiteboard',
            'asset_code' => 'AST-001',
            'category' => 'Electronics',
            'status' => 'in_use',
        ]);

        $inventoryItem = $this->createInventoryItem($organization, 'Exercise Notebook', 40, 10);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'lead',
            'label' => 'Lead Note',
            'field_key' => 'lead_note',
            'field_type' => 'text',
        ]);

        $this->actingAs($admin)->post('/custom-fields/values', [
            'entity' => 'lead',
            'entity_id' => $lead->id,
            'values' => ['lead_note' => 'Interested in Class 5'],
        ])->assertRedirect();

        $this->actingAs($admin)
            ->get('/custom-fields')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.recordCounts.student', 0)
                ->where('summary.recordCounts.staff', 2)
                ->where('summary.recordCounts.lead', 1)
                ->where('summary.recordCounts.book', 1)
                ->where('summary.recordCounts.asset', 1)
                ->where('summary.recordCounts.inventory', 1)
                ->where('records.0.entity', 'student')
                ->where('records.1.entity', 'staff')
                ->where('records.2.entity', 'lead')
                ->where('records.2.records.0.entityId', $lead->id)
                ->where('records.2.records.0.name', 'Riya Kapoor')
                ->where('records.2.records.0.values.lead_note', 'Interested in Class 5')
                ->where('records.3.records.0.name', 'Wings of Fire')
                ->where('records.4.records.0.name', 'Interactive Whiteboard')
                ->where('records.5.records.0.name', 'Exercise Notebook')
            );

        $field = CustomFieldDefinition::query()->where('field_key', 'lead_note')->first();
        $this->assertSame(
            'Interested in Class 5',
            CustomFieldValue::query()->where('field_id', $field->id)->where('entity', 'lead')->where('entity_id', $lead->id)->value('value')
        );
    }

    public function test_public_admission_form_exposes_and_stores_custom_fields(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Subjects',
            'field_key' => 'subjects',
            'field_type' => 'multi-select',
            'options' => ['Maths', 'Science', 'English'],
            'is_required' => true,
            'show_in_admission' => true,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Nickname',
            'field_key' => 'nickname',
            'field_type' => 'text',
            'is_required' => false,
            'show_in_admission' => true,
        ]);
        CustomFieldDefinition::query()->create([
            'organization_id' => $organization->id,
            'entity' => 'student',
            'label' => 'Internal Note',
            'field_key' => 'internal_note',
            'field_type' => 'text',
            'show_in_admission' => false,
        ]);

        $this->get('/admissions/apply')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('PublicAdmissionForm')
                ->has('admissionCustomFields', 2)
                ->where('admissionCustomFields.0.fieldKey', 'subjects')
                ->where('admissionCustomFields.0.fieldType', 'multi-select')
                ->where('admissionCustomFields.0.options', ['Maths', 'Science', 'English'])
                ->where('admissionCustomFields.0.isRequired', true)
                ->where('admissionCustomFields.1.fieldKey', 'nickname')
            );

        $email = 'parent-'.uniqid().'@example.com';
        $token = 'verified-token-'.uniqid();
        Cache::store('file')->put('admission_inquiry_email_verified_'.$token, $email, now()->addMinutes(30));

        $basePayload = [
            'full_name' => 'Diya Sharma',
            'email' => $email,
            'phone' => '9876512345',
            'program_interest' => '5',
            'previous_institution' => '',
            'message' => '',
            'email_verification_token' => $token,
        ];

        $this->post('/admissions', $basePayload)->assertSessionHasErrors('custom_fields.subjects');

        $this->post('/admissions', $basePayload + [
            'custom_fields' => ['subjects' => ['Maths', 'English'], 'nickname' => 'Diya', 'internal_note' => 'ignored'],
        ])->assertRedirect();

        $inquiry = AdmissionInquiry::query()->where('email', $email)->first();
        $this->assertNotNull($inquiry);
        $this->assertIsArray($inquiry->custom_data);
        $this->assertSame(['Maths', 'English'], json_decode($inquiry->custom_data['subjects'], true));
        $this->assertSame('Diya', $inquiry->custom_data['nickname']);
        $this->assertArrayNotHasKey('internal_note', $inquiry->custom_data);

        $class = $this->createClass($organization);

        $admin = $this->createUser($organization, 'admin');
        $this->actingAs($admin)->post("/online-admission/{$inquiry->id}/enroll", [
            'class_id' => $class->id,
            'date_of_birth' => '2013-09-09',
            'gender' => 'female',
            'admission_date' => '2026-06-10',
        ])->assertRedirect();

        $student = Student::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($student);

        $subjectsField = CustomFieldDefinition::query()->where('field_key', 'subjects')->first();
        $nicknameField = CustomFieldDefinition::query()->where('field_key', 'nickname')->first();
        $this->assertSame('["Maths","English"]', CustomFieldValue::query()->where('field_id', $subjectsField->id)->where('entity_id', $student->id)->value('value'));
        $this->assertSame('Diya', CustomFieldValue::query()->where('field_id', $nicknameField->id)->where('entity_id', $student->id)->value('value'));
    }

    private function createInventoryItem(Organization $organization, string $name, int $stock, int $minimum): InventoryItem
    {
        static $counter = 0;
        $counter++;

        $category = InventoryCategory::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Custom Fields Category '.$counter,
        ]);

        $store = InventoryStore::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Custom Fields Store '.$counter,
            'manager' => 'Store Manager '.$counter,
        ]);

        $supplier = InventorySupplier::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Supplier '.$counter,
            'contact_person' => 'Contact '.$counter,
        ]);

        return InventoryItem::query()->create([
            'organization_id' => $organization->id,
            'inventory_category_id' => $category->id,
            'inventory_store_id' => $store->id,
            'inventory_supplier_id' => $supplier->id,
            'name' => $name,
            'unit' => 'pcs',
            'available_stock' => $stock,
            'minimum_stock' => $minimum,
        ]);
    }

    private function createClass(Organization $organization): SchoolClass
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Custom Fields School '.$counter,
            'slug' => 'custom-fields-school-'.$counter,
            'email' => 'custom-fields-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}