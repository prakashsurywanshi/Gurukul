<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                ->has('definitions', 2)
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
                ->where('summary.studentRecords', 1)
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
                ->where('summary.studentRecords', 0)
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