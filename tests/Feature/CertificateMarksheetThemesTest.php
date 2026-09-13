<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CertificateMarksheetThemesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_marksheet_page_with_real_data(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $student = $this->createStudent($organization, $class, 'ADM-001');
        $exam = $this->createExam($organization, $year, $class);
        $schedule = $this->createSchedule($exam, $class, $subject);

        ExamResult::query()->create([
            'organization_id' => $organization->id,
            'exam_schedule_id' => $schedule->id,
            'student_id' => $student->id,
            'theory_marks' => 85.00,
            'practical_marks' => 0.00,
            'total_marks' => 100.00,
            'obtained_marks' => 85.00,
            'grade' => 'A',
            'is_absent' => false,
            'entered_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/certificates/marksheet')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/MarksheetManagement')
                ->where('organization.name', 'Gurukul Public School')
                ->has('students', 1)
                ->where('students.0.first_name', 'Aarav')
                ->where('students.0.class', '10')
                ->where('students.0.section', 'A')
                ->where('students.0.roll_number', '5')
                ->has('examGroups', 1)
                ->where('examGroups.0.name', 'Term 1')
                ->where('examGroups.0.className', '10')
                ->where('examGroups.0.section', 'A')
                ->has('examGroups.0.exams', 1)
                ->where('examGroups.0.exams.0.subject', 'Mathematics')
                ->where('examGroups.0.exams.0.total_marks', 100)
                ->where('examGroups.0.exams.0.passing_marks', 33)
                ->has('examGroups.0.exams.0.results', 1)
                ->where('examGroups.0.exams.0.results.0.student_id', (string) $student->id)
                ->where('examGroups.0.exams.0.results.0.marks_obtained', 85)
                ->where('examGroups.0.exams.0.results.0.grade', 'A'));
    }

    public function test_receptionist_cannot_view_marksheet_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/certificates/marksheet')
            ->assertForbidden();
    }

    public function test_admin_can_view_student_id_card_page_with_real_students(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $student = $this->createStudent($organization, $class, 'ADM-002');

        $this->actingAs($admin)
            ->get('/certificates/student-id-card')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentIdCardManagement')
                ->has('students', 1)
                ->where('students.0.id', (string) $student->id)
                ->where('students.0.admission_no', 'ADM-002')
                ->where('students.0.first_name', 'Aarav')
                ->where('students.0.class', '10')
                ->where('students.0.section', 'A'));
    }

    public function test_themes_page_returns_saved_theme(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $organization->update(['settings' => ['dashboard_theme' => 'dark']]);

        $this->actingAs($admin)
            ->get('/settings/themes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Themes')
                ->where('theme', 'dark'));
    }

    public function test_themes_page_defaults_to_system(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/settings/themes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Themes')
                ->where('theme', 'system'));
    }

    public function test_admin_can_update_dashboard_theme(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->patch('/settings/themes', ['theme' => 'dark'])
            ->assertRedirect()
            ->assertSessionHas('success', 'Theme updated.');

        $this->assertSame('dark', $organization->fresh()->settings['dashboard_theme']);
    }

    public function test_theme_update_rejects_invalid_theme(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->patch('/settings/themes', ['theme' => 'neon'])
            ->assertSessionHasErrors('theme');

        $this->assertArrayNotHasKey('dashboard_theme', $organization->fresh()->settings ?? []);
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

    private function createSubject(Organization $organization): Subject
    {
        return Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'core',
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

    private function createSchedule(Exam $exam, SchoolClass $class, Subject $subject): ExamSchedule
    {
        return ExamSchedule::query()->create([
            'exam_id' => $exam->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'exam_date' => '2026-09-14',
            'start_time' => '08:30:00',
            'end_time' => '10:30:00',
            'room_number' => '101',
            'max_marks' => 100,
            'passing_marks' => 33,
        ]);
    }
}