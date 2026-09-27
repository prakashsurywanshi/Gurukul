<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\StaffProfile;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use ZipArchive;

class PortalRecordsFeatureTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    private User $teacher;

    private Student $studentOne;

    private Student $studentTwo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::query()->create([
            'name' => 'Portal Records Test School',
            'slug' => 'portal-records-test-school',
            'email' => 'portal-records-test@example.com',
            'phone' => '02212345678',
            'address' => 'MG Road',
            'city' => 'Pune',
            'state' => 'Maharashtra',
            'pincode' => '411001',
            'settings' => [
                'compliance_profile' => [
                    'udise_code' => '27211234567',
                    'district' => 'Pune',
                    'block' => 'Pune City',
                    'board' => 'SSC',
                    'affiliation_no' => 'SSC-AFF-2026',
                    'school_category' => 'Secondary',
                    'medium_of_instruction' => 'Marathi',
                    'grades_offered' => '1 to 10',
                ],
            ],
        ]);

        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->teacher = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'teacher',
            'status' => 'active',
            'name' => 'Sunita Deshmukh',
            'gender' => 'female',
            'date_of_birth' => '1985-02-10',
        ]);

        $this->teacher->profile()->create([
            'organization_id' => $this->organization->id,
            'aadhar_number' => '012345678901',
            'pan' => 'ABCDE1234F',
            'national_teacher_id' => 'NCT-2026-0001',
            'employee_code' => 'EMP-1001',
            'qualification' => 'M.Sc, B.Ed',
            'appointment_type' => 'Regular',
            'tet_status' => 'CTET Passed',
        ]);

        $year = AcademicYear::query()->create([
            'organization_id' => $this->organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $schoolClass = SchoolClass::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $this->studentOne = Student::query()->create([
            'organization_id' => $this->organization->id,
            'class_id' => $schoolClass->id,
            'admission_no' => 'ADM-9001',
            'roll_number' => '1',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'mother_name' => 'Nisha Mehta',
            'aadhar_number' => '012345678901',
            'register_no' => 'GR-2026-001',
            'saral_student_id' => 'SAR-2026-0001',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        $this->studentTwo = Student::query()->create([
            'organization_id' => $this->organization->id,
            'class_id' => $schoolClass->id,
            'admission_no' => 'ADM-9002',
            'roll_number' => '2',
            'first_name' => 'Ishita',
            'last_name' => 'Sharma',
            'date_of_birth' => '2011-06-21',
            'gender' => 'female',
            'admission_date' => '2026-04-11',
            'father_name' => 'Vikram Sharma',
            'mother_name' => 'Kavita Sharma',
            'aadhar_number' => '',
            'register_no' => 'GR-2026-002',
            'saral_student_id' => 'SAR-2026-0002',
            'phone' => '9876543211',
            'status' => 'active',
        ]);

        foreach ([$this->studentOne, $this->studentTwo] as $student) {
            StudentAcademicHistory::query()->create([
                'organization_id' => $this->organization->id,
                'student_id' => $student->id,
                'academic_year_id' => $year->id,
                'class_id' => $schoolClass->id,
                'session' => $year->name,
                'is_current' => true,
                'entry_type' => 'admission',
                'effective_date' => $student->admission_date,
                'status' => 'active',
            ]);
        }
    }

    public function test_portal_records_page_exposes_state_presets_and_readiness(): void
    {
        $this->actingAs($this->admin)
            ->get('/portal-records')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PortalRecords')
                ->where('currentState', 'maharashtra')
                ->where('udiseCode', '27211234567')
                ->has('presets', 3)
                ->where('presets.0.key', 'udiseplus')
                ->where('presets.1.key', 'saral-maharashtra')
                ->where('presets.2.key', 'generic')
                ->has('customTemplates', 0)
                ->has('presets.0.sheets', 3)
                ->where('presets.0.sheets.0.requiredCoverage', 100)
                ->where('presets.0.sheets.2.readyCount', 2)
                ->where('presets.1.sheets.0.rowsNeedingAttention', 1));
    }

    public function test_portal_records_page_rejects_non_admin_roles(): void
    {
        $librarian = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'librarian',
        ]);

        $this->actingAs($librarian)
            ->get('/portal-records')
            ->assertForbidden();

        $this->actingAs($librarian)
            ->get('/portal-records/export?schema=udiseplus&format=csv&sheet=Students')
            ->assertForbidden();
    }

    public function test_csv_export_keeps_identifiers_as_strings_and_applies_lookups(): void
    {
        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=udiseplus&format=csv&sheet=Students')
            ->assertOk();

        $csv = (string) $response->getContent();
        $this->assertStringContainsString('UDISE Student ID (EID)', $csv);
        $this->assertStringContainsString('012345678901', $csv);
        $this->assertStringContainsString('"AARAV MEHTA",1', $csv);
        $this->assertStringContainsString('"ISHITA SHARMA",2', $csv);
        $this->assertStringContainsString('15/03/2012', $csv);
    }

    public function test_csv_blank_mode_drops_data_rows_but_keeps_header(): void
    {
        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=udiseplus&format=csv&sheet=Students&mode=blank')
            ->assertOk();

        $csv = (string) $response->getContent();
        $this->assertStringContainsString('UDISE Student ID (EID)', $csv);
        $this->assertStringNotContainsString('012345678901', $csv);
        $this->assertStringNotContainsString('AARAV MEHTA', $csv);
    }

    public function test_csv_zip_contains_every_sheet(): void
    {
        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=udiseplus&format=csv-zip')
            ->assertOk();

        $this->assertStringContainsString('application/zip', (string) $response->headers->get('Content-Type'));

        $path = tempnam(sys_get_temp_dir(), 'qgzip');
        file_put_contents($path, (string) $response->getContent());
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path) === true);

        $students = $zip->getFromName('Students.csv');
        $staff = $zip->getFromName('Staff.csv');
        $school = $zip->getFromName('School-Profile.csv');

        $this->assertNotFalse($students);
        $this->assertNotFalse($staff);
        $this->assertNotFalse($school);

        $this->assertStringContainsString('UDISE Student ID (EID)', $students);
        $this->assertStringContainsString('012345678901', $students);
        $this->assertStringContainsString('Teacher National Code', $staff);
        $this->assertStringContainsString('NCT-2026-0001', $staff);
        $this->assertStringContainsString('UDISE Code', $school);
        $this->assertStringContainsString('27211234567', $school);

        $zip->close();
        @unlink($path);
    }

    public function test_xlsx_export_is_multi_sheet_and_preserves_leading_zero_identifiers(): void
    {
        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=saral-maharashtra&format=xlsx')
            ->assertOk();

        $path = tempnam(sys_get_temp_dir(), 'qgxlsx');
        file_put_contents($path, (string) $response->getContent());
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path) === true);

        $foundSheets = [];
        $foundStringAadhaar = false;
        $foundStringRegister = false;

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $name = $zip->getNameIndex($index);
            $content = (string) $zip->getFromIndex($index);

            if ($name === 'xl/workbook.xml') {
                $this->assertStringContainsString('<sheet ', $content);
            }

            if (str_contains($name, 'xl/worksheets/') && str_ends_with($name, '.xml')) {
                $foundSheets[] = $name;
                if ($content !== '' && str_contains($content, 'inlineStr')) {
                    $foundStringAadhaar = $foundStringAadhaar || str_contains($content, '012345678901');
                    $foundStringRegister = $foundStringRegister || str_contains($content, 'GR-2026-001');
                }
            }
        }

        $this->assertGreaterThanOrEqual(3, count($foundSheets));
        $this->assertTrue($foundStringAadhaar, 'Aadhaar must be written as an inline string cell, keeping leading zeros.');
        $this->assertTrue($foundStringRegister, 'Register No. must be written as an inline string cell.');

        $zip->close();
        @unlink($path);
    }

    public function test_xlsx_blank_mode_contains_only_headers(): void
    {
        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=udiseplus&format=xlsx&mode=blank')
            ->assertOk();

        $binary = (string) $response->getContent();
        $this->assertStringNotContainsString('012345678901', $binary);
        $this->assertStringNotContainsString('AARAV MEHTA', $binary);
    }

    public function test_custom_template_crud_and_generation(): void
    {
        $payload = [
            'name' => 'Board DCF 2026',
            'description' => 'Custom board format',
            'sheets' => [
                [
                    'name' => 'Enrolment',
                    'entity' => 'student',
                    'columns' => [
                        ['label' => 'Candidate Name', 'source' => 'student.name_full', 'required' => true],
                        ['label' => 'Gender Code', 'source' => 'student.gender', 'lookup' => 'gender_udise', 'required' => true],
                        ['label' => 'Session', 'static' => '2026-27'],
                    ],
                ],
            ],
        ];

        $this->actingAs($this->admin)
            ->post('/portal-records/templates', $payload)
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->actingAs($this->admin)
            ->get('/portal-records')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PortalRecords')
                ->has('customTemplates', 1)
                ->where('customTemplates.0.name', 'Board DCF 2026'));

        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=custom:0&format=csv&sheet=Enrolment')
            ->assertOk();

        $csv = (string) $response->getContent();
        $this->assertStringContainsString('Candidate Name', $csv);
        $this->assertStringContainsString('Aarav Mehta', $csv);
        $this->assertStringContainsString(',1,2026-27', $csv);

        $this->actingAs($this->admin)
            ->patch('/portal-records/templates/0', [
                ...$payload,
                'name' => 'Board DCF 2027',
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->actingAs($this->admin)
            ->get('/portal-records')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PortalRecords')
                ->where('customTemplates.0.name', 'Board DCF 2027'));

        $this->actingAs($this->admin)
            ->delete('/portal-records/templates/0')
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->actingAs($this->admin)
            ->get('/portal-records')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PortalRecords')
                ->has('customTemplates', 0));
    }

    public function test_custom_template_export_requires_valid_payload(): void
    {
        $this->actingAs($this->admin)
            ->post('/portal-records/templates', [
                'name' => '',
                'sheets' => [],
            ])
            ->assertSessionHasErrors(['name', 'sheets']);
    }

    public function test_state_can_be_updated(): void
    {
        $this->actingAs($this->admin)
            ->patch('/portal-records/state', ['state' => 'maharashtra'])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->actingAs($this->admin)
            ->patch('/portal-records/state', ['state' => 'not-a-state'])
            ->assertSessionHasErrors(['state']);
    }

    public function test_saral_staff_sheet_exports_staff_portal_fields(): void
    {
        $response = $this->actingAs($this->admin)
            ->get('/portal-records/export?schema=saral-maharashtra&format=csv&sheet=SARAL%20Staff')
            ->assertOk();

        $csv = (string) $response->getContent();
        $this->assertStringContainsString('Staff Code', $csv);
        $this->assertStringContainsString('Sunita Deshmukh', $csv);
        $this->assertStringContainsString('012345678901', $csv);
        $this->assertStringContainsString('ABCDE1234F', $csv);
        $this->assertStringContainsString('CTET Passed', $csv);
    }

    public function test_student_profile_fields_can_be_created_and_serialized(): void
    {
        $this->actingAs($this->admin)
            ->post('/students', [
                ...$this->validStudentPayload(),
                'aadhar_number' => '098765432109',
                'register_no' => 'GR-2026-111',
                'udise_student_id' => 'UD-2026-111',
                'saral_student_id' => 'SAR-2026-111',
            ])
            ->assertRedirect();

        $student = Student::query()
            ->where('organization_id', $this->organization->id)
            ->where('register_no', 'GR-2026-111')
            ->first();

        $this->assertNotNull($student);
        $this->assertSame('098765432109', $student->aadhar_number);
        $this->assertSame('UD-2026-111', $student->udise_student_id);
        $this->assertSame('SAR-2026-111', $student->saral_student_id);
    }

    public function test_staff_profile_fields_can_be_created_via_staff_form(): void
    {
        $this->actingAs($this->admin)
            ->post('/staff', [
                'name' => 'New Teacher',
                'email' => 'new.teacher@example.com',
                'password' => 'secret123',
                'role' => 'teacher',
                'status' => 'active',
                'profile' => [
                    'aadhar_number' => '223344556677',
                    'pan' => 'XYZAB1234C',
                    'national_teacher_id' => 'NCT-2027-0001',
                    'subjects_taught' => ['Maths', 'Science'],
                ],
            ])
            ->assertRedirect();

        $staff = User::query()
            ->where('organization_id', $this->organization->id)
            ->where('email', 'new.teacher@example.com')
            ->first();

        $this->assertNotNull($staff);
        $profile = StaffProfile::query()->where('user_id', $staff->id)->first();
        $this->assertNotNull($profile);
        $this->assertSame('223344556677', $profile->aadhar_number);
        $this->assertSame(['Maths', 'Science'], $profile->subjects_taught);
    }

    public function test_listing_pages_seed_search_from_query(): void
    {
        $this->actingAs($this->admin);

        $this->get('/students?q='.urlencode('Aarav Mehta'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard/StudentManagement')
                ->where('initialSearch', 'Aarav Mehta'));

        $this->get('/staff?q='.urlencode('Sunita Deshmukh'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard/UserManagement')
                ->where('initialSearch', 'Sunita Deshmukh'));

        $this->get('/students')
            ->assertInertia(fn (Assert $page) => $page->where('initialSearch', ''));
    }

    private function validStudentPayload(): array
    {
        return [
            'first_name' => 'Kabir',
            'middle_name' => 'Suresh',
            'last_name' => 'Patil',
            'first_name_mr' => 'कबीर',
            'middle_name_mr' => 'सुरेश',
            'last_name_mr' => 'पाटील',
            'email' => 'kabir.patil@example.com',
            'phone' => '9876500000',
            'date_of_birth' => '2013-01-05',
            'gender' => 'male',
            'class' => '10',
            'section' => 'A',
            'roll_number' => '3',
            'admission_date' => '2026-04-12',
        ];
    }
}