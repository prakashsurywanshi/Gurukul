<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Services\TemplateAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdCardTemplateAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_id_card_page_exposes_assigned_template_and_per_student_context(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'IDC-001');

        $template = $this->createIdCardTemplate($organization, ['{{student_name}}', '{{qr_code_url}}']);
        app(TemplateAssignmentService::class)->assign($organization, 'student-id-card', $template->id);

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentIdCardManagement')
                ->where('assignedTemplate.title', 'Student ID Card Design')
                ->where('assignedTemplate.cardWidthMm', 85.6)
                ->where('assignedTemplate.cardHeightMm', 54)
                ->where('assignedTemplate.backContent', '<div>{{school_name}}</div>')
                ->where('students.0.idCardContext.student_name', 'Aarav Mehta')
                ->where('students.0.idCardContext.school_name', 'Gurukul Public School'));
    }

    public function test_student_id_card_page_omits_context_when_no_template_assigned(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $this->createStudent($organization, $class, 'IDC-002');

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentIdCardManagement')
                ->where('assignedTemplate', null)
                ->missing('students.0.idCardContext'));
    }

    public function test_staff_id_card_page_exposes_assigned_template_and_member_context(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $template = $this->createIdCardTemplate($organization, ['{{staff_name}}', '{{qr_code_url}}']);
        app(TemplateAssignmentService::class)->assign($organization, 'staff-id-card', $template->id);

        $this->actingAs($admin)
            ->get('/staff/id-cards')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffIdCards')
                ->where('assignedTemplate.title', 'Student ID Card Design')
                ->where('staff.0.idCardContext.staff_name', $admin->name));

        $this->assertNotNull($admin->fresh()->qr_token);
    }

    public function test_staff_id_card_page_omits_context_when_no_template_assigned(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/staff/id-cards')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffIdCards')
                ->where('assignedTemplate', null)
                ->missing('staff.0.idCardContext'));
    }

    public function test_card_designs_page_exposes_assigned_student_template_only_when_assigned(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/id-cards/designs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CardDesigns')
                ->where('assignedTemplate', null));

        $template = $this->createIdCardTemplate($organization, ['{{student_name}}']);
        app(TemplateAssignmentService::class)->assign($organization, 'student-id-card', $template->id);

        $this->actingAs($admin)
            ->get('/id-cards/designs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CardDesigns')
                ->where('assignedTemplate.id', (string) $template->id)
                ->where('assignedTemplate.cardWidthMm', 85.6));
    }

    public function test_certificate_management_page_exposes_assigned_template_and_per_student_context(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'CERT-001');

        $template = $this->createCertificateTemplate($organization);
        app(TemplateAssignmentService::class)->assign($organization, 'certificate', $template->id);

        $this->actingAs($admin)
            ->get('/certificates')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CertificateManagement')
                ->where('assignedTemplate.title', 'Certificate Design')
                ->where('assignedTemplate.cardWidthMm', 297)
                ->where('assignedTemplate.cardHeightMm', 210)
                ->where('students.0.certificateContext.student_name', 'Aarav Mehta')
                ->where('students.0.certificateContext.school_name', 'Gurukul Public School')
                ->where('students.0.certificateContext.father_name', 'Rajesh Mehta'));
    }

    public function test_certificate_management_page_omits_context_when_no_template_assigned(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $this->createStudent($organization, $class, 'CERT-002');

        $this->actingAs($admin)
            ->get('/certificates')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CertificateManagement')
                ->where('assignedTemplate', null)
                ->missing('students.0.certificateContext'));
    }

    private function createIdCardTemplate(Organization $organization, array $tokens): CertificateTemplate
    {
        $twins = '<img src="{{qr_code_url}}" width="40" height="40" />'
            .'<div>'.($tokens[0] ?? '{{student_name}}').' — {{school_name}}</div>';

        return CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Student ID Card Design',
            'type' => 'programme',
            'category' => 'staff_id_card',
            'editor_type' => 'fabric',
            'description' => 'Assigned react design',
            'content' => $twins,
            'back_content' => '<div>{{school_name}}</div>',
            'card_width_mm' => 85.6,
            'card_height_mm' => 54,
            'status' => 'active',
        ]);
    }

    private function createCertificateTemplate(Organization $organization): CertificateTemplate
    {
        return CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Certificate Design',
            'type' => 'achievement',
            'category' => 'certificate',
            'editor_type' => 'fabric',
            'description' => 'Assigned certificate design',
            'content' => '<div>{{student_name}} — {{academic_session}} — {{class_section}} — {{father_name}}</div>',
            'back_content' => null,
            'card_width_mm' => 297.0,
            'card_height_mm' => 210.0,
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

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }
}
