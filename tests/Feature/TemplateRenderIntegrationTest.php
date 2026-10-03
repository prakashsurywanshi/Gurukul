<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\CertificateTemplate;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Services\TemplateAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateRenderIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_canvas_designer_edit_binds_library_template_via_route(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $library = CertificateTemplate::query()->create([
            'organization_id' => null,
            'title' => 'Library Cert',
            // certificate_templates.type is the award type
            // enum('merit','achievement','participation','appreciation',
            // 'completion'); the template kind lives in `category`.
            'type' => 'completion',
            'category' => 'certificate',
            'editor_type' => 'fabric',
            'description' => 'Library row',
            'is_system' => true,
            'status' => 'active',
            'card_width_mm' => 210,
            'card_height_mm' => 297,
            'content' => '<div class="cd-page"></div>',
            'content_json' => ['objects' => []],
        ]);

        $this->actingAs($admin)
            ->get('/canvas-designer/' . $library->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CanvasDesigner')
                ->where('template.id', (string) $library->id)
                ->where('template.title', 'Library Cert')
                ->where('cardWidthMm', 210)
                ->where('cardHeightMm', 297));
    }

    public function test_gallery_use_copies_library_template_into_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $library = CertificateTemplate::query()->create([
            'organization_id' => null,
            'title' => 'Library Cert',
            // certificate_templates.type is the award type
            // enum('merit','achievement','participation','appreciation',
            // 'completion'); the template kind lives in `category`.
            'type' => 'completion',
            'category' => 'certificate',
            'editor_type' => 'fabric',
            'description' => 'Library row',
            'is_system' => true,
            'status' => 'active',
            'card_width_mm' => 210,
            'card_height_mm' => 297,
            'content' => '<div class="cd-page"></div>',
            'content_json' => ['objects' => []],
        ]);

        $this->actingAs($admin)
            ->post('/template-gallery/use/' . $library->id)
            ->assertRedirect();

        $copy = CertificateTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('title', 'Library Cert')
            ->first();

        $this->assertNotNull($copy);

        $this->actingAs($admin)
            ->get('/canvas-designer/' . $copy->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CanvasDesigner')
                ->where('template.id', (string) $copy->id)
                ->where('template.isSystem', false));
    }

    public function test_template_print_renders_assigned_hall_ticket_design_with_substitution(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'ADM-HT-001');
        $exam = $this->createExam($organization, $year, $class);

        $template = $this->createFabricTemplate($organization);
        app(TemplateAssignmentService::class)->assign($organization, 'hall-ticket', $template->id);

        $response = $this->actingAs($admin)
            ->postJson('/template-print', [
                'slot' => 'hall-ticket',
                'student_ids' => [(string) $student->id],
                'exam_id' => $exam->id,
            ])
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonStructure(['html']);

        $html = $response->json('html');

        $this->assertIsString($html);
        $this->assertStringContainsString('Aarav Mehta', $html);
        $this->assertStringContainsString('cd-page', $html);
    }

    public function test_template_print_substitutes_all_known_tokens_and_leaves_no_placeholders(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'ADM-HT-002');
        $exam = $this->createExam($organization, $year, $class);

        $template = $this->createFabricTemplate($organization);
        app(TemplateAssignmentService::class)->assign($organization, 'hall-ticket', $template->id);

        $html = $this->actingAs($admin)
            ->postJson('/template-print', [
                'slot' => 'hall-ticket',
                'student_ids' => [(string) $student->id],
                'exam_id' => $exam->id,
            ])
            ->assertOk()
            ->json('html');

        $this->assertStringContainsString('Aarav Mehta', $html);
        $this->assertStringContainsString('Gurukul Public School', $html);
        $this->assertStringContainsString('Term 1', $html);
        $this->assertStringNotContainsString('{{', $html);
        $this->assertStringContainsString('cd-page', $html);
    }

    public function test_template_print_returns_null_when_slot_is_unassigned(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'ADM-HT-003');

        $this->actingAs($admin)
            ->postJson('/template-print', [
                'slot' => 'hall-ticket',
                'student_ids' => [(string) $student->id],
            ])
            ->assertOk()
            ->assertJsonPath('html', null)
            ->assertJsonPath('count', 0);
    }

    public function test_certificate_preview_renders_gallery_twin_for_each_student(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'ADM-CERT-001');

        $template = $this->createFabricTemplate($organization, 'certificate');

        $expectedTwin = '<div class="cd-page" style="width:210mm;height:297mm;position:relative;">'
            . '<h1 style="position:absolute;left:10mm;top:10mm;margin:0;">Gurukul Public School</h1>'
            . '<p style="position:absolute;left:10mm;top:40mm;margin:0;">Aarav Mehta</p>'
            . '<p style="position:absolute;left:10mm;top:50mm;margin:0;">ADM-CERT-001</p>'
            . '<p style="position:absolute;left:10mm;top:60mm;margin:0;"></p>'
            . '</div>';

        $this->actingAs($admin)
            ->get('/documents/generate/preview?' . http_build_query([
                'class' => $class->id,
                'students' => (string) $student->id,
                'template' => $template->id,
                'layout' => 'certificate',
                'card' => 'custom',
                'w' => 210,
                'h' => 297,
                'paper' => 'a4',
                'orientation' => 'portrait',
                'margin' => 0,
                'gap' => 0,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GenerateDocumentPreview')
                ->where('cards.0.design.twin', $expectedTwin)
                ->where('cards.0.design.elements', [])
                ->where('sheet.cardW', 210)
                ->where('sheet.cardH', 297));
    }

    public function test_certificate_preview_falls_back_to_legacy_elements_without_twin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'ADM-CERT-002');

        $legacy = CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Legacy Preset',
            // certificate_templates.type is the award type
            // enum('merit','achievement','participation','appreciation',
            // 'completion'); the template kind lives in `category`.
            'type' => 'completion',
            'design_settings' => ['preset' => 'red'],
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/documents/generate/preview?' . http_build_query([
                'class' => $class->id,
                'students' => (string) $student->id,
                'template' => $legacy->id,
                'layout' => 'certificate',
                'card' => 'custom',
                'w' => 210,
                'h' => 297,
                'paper' => 'a4',
                'orientation' => 'portrait',
                'margin' => 0,
                'gap' => 0,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GenerateDocumentPreview')
                ->where('cards.0.design.twin', null)
                ->has('cards.0.design.elements', 7));
    }

    private function createFabricTemplate(Organization $organization, string $type = 'hall_ticket'): CertificateTemplate
    {
        return CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => ucfirst(str_replace('_', ' ', $type)) . ' Design',
            'type' => 'completion',
            'category' => $type,
            'editor_type' => 'fabric',
            'description' => 'Assigned server design',
            'content' => '<div class="cd-page" style="width:210mm;height:297mm;position:relative;">'
                . '<h1 style="position:absolute;left:10mm;top:10mm;margin:0;">{{school_name}}</h1>'
                . '<p style="position:absolute;left:10mm;top:40mm;margin:0;">{{student_name}}</p>'
                . '<p style="position:absolute;left:10mm;top:50mm;margin:0;">{{admission_no}}</p>'
                . '<p style="position:absolute;left:10mm;top:60mm;margin:0;">{{exam_name}}</p>'
                . '</div>',
            'card_width_mm' => 210,
            'card_height_mm' => 297,
            'status' => 'active',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'admin@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }

    private function createAcademicYear(Organization $organization): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function createClass(Organization $organization, AcademicYear $year): SchoolClass
    {
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

    private function createStudent(Organization $organization, SchoolClass $class, string $admissionNo): Student
    {
        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $class->academic_year_id,
            'class_id' => $class->id,
            'session' => '2026-2027',
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        return $student;
    }

    private function createExam(Organization $organization, AcademicYear $year, SchoolClass $class): Exam
    {
        return Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'Term 1',
            'exam_type' => 'term_exam',
            'publish_status' => 'published',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-25',
            'description' => json_encode([
                'class_name' => $class->name,
                'section' => $class->section,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '',
            'status' => 'scheduled',
        ]);
    }
}