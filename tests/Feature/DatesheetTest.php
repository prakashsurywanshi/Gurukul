<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatesheetTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_datesheets_list(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->createSchedule($exam, $class, $subject);

        $this->actingAs($admin)
            ->get('/datesheets')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Datesheets')
                ->has('exams', 1)
                ->has('academicYears')
                ->has('selectedSessionId')
                ->where('exams.0.id', $exam->id)
                ->where('exams.0.name', 'Term 1')
                ->where('exams.0.publishStatus', 'draft')
                ->where('exams.0.classesInScope', 1)
            );
    }

    public function test_datesheets_list_can_filter_by_session(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $otherYear = $this->createAcademicYear($organization, '2025-2026', false);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $this->createExam($organization, $year);
        $otherExam = $this->createExam($organization, $otherYear, 'Half Yearly');
        $this->createSchedule($otherExam, $class, $subject);

        $this->actingAs($admin)
            ->get('/datesheets?session=' . $year->id)
            ->assertInertia(fn ($page) => $page
                ->has('exams', 1)
                ->where('exams.0.name', 'Term 1')
            );
    }

    public function test_receptionist_cannot_view_datesheets(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/datesheets')
            ->assertForbidden();
    }

    public function test_admin_can_view_datesheet_detail_with_schedule(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->createSchedule($exam, $class, $subject, '2026-09-14', '08:30:00', '10:30:00', '101');

        $this->actingAs($admin)
            ->get("/datesheets/{$exam->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DatesheetDetail')
                ->where('published', false)
                ->where('hasSchedule', true)
                ->where('exam.id', $exam->id)
                ->where('exam.classesInScope', 1)
                ->where('allSheet.rows.0.subject', 'Mathematics')
                ->where('allSheet.rows.0.room', '101')
                ->where('classSheets.0.title', '10-A')
            );
    }

    public function test_datesheet_detail_warns_about_missing_room(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->createSchedule($exam, $class, $subject, '2026-09-14', '08:30:00', '10:30:00', null);

        $this->actingAs($admin)
            ->get("/datesheets/{$exam->id}")
            ->assertInertia(fn ($page) => $page
                ->where('allSheet.warnings', ['Mathematics'])
                ->where('allSheet.rows.0.room', null)
            );
    }

    public function test_datesheet_detail_shows_empty_state_without_schedule(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $exam = $this->createExam($organization, $year);

        $this->actingAs($admin)
            ->get("/datesheets/{$exam->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('hasSchedule', false)
                ->where('exam.classesInScope', 0)
                ->where('allSheet.rows', [])
            );
    }

    public function test_admin_can_publish_datesheet(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $exam = $this->createExam($organization, $year);

        $this->actingAs($admin)
            ->post("/datesheets/{$exam->id}/publish", [
                'scope' => 'all',
                'note' => 'Best of luck to all students!',
            ])
            ->assertRedirect();

        $this->assertSame('published', $exam->fresh()->publish_status);
        $this->assertSame('Best of luck to all students!', $exam->fresh()->datesheet_note);
    }

    public function test_publish_keeps_previous_note_when_not_supplied(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $exam = $this->createExam($organization, $year);
        $exam->update(['publish_status' => 'published', 'datesheet_note' => 'Old note']);

        $this->actingAs($admin)
            ->post("/datesheets/{$exam->id}/publish", ['scope' => 'all'])
            ->assertRedirect();

        $this->assertSame('published', $exam->fresh()->publish_status);
        $this->assertNull($exam->fresh()->datesheet_note);
    }

    public function test_cannot_view_other_organization_datesheet(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherYear = $this->createAcademicYear($otherOrganization);
        $otherExam = $this->createExam($otherOrganization, $otherYear);

        $this->actingAs($admin)
            ->get("/datesheets/{$otherExam->id}")
            ->assertNotFound();
    }

    public function test_cannot_publish_other_organization_datesheet(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherYear = $this->createAcademicYear($otherOrganization);
        $otherExam = $this->createExam($otherOrganization, $otherYear);

        $this->actingAs($admin)
            ->post("/datesheets/{$otherExam->id}/publish", ['scope' => 'all'])
            ->assertNotFound();

        $this->assertSame('draft', $otherExam->fresh()->publish_status);
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $slug = 'gurukul-public-school', string $email = 'admin@gurukul.test'): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => $slug,
            'email' => $email,
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

    private function createAcademicYear(Organization $organization, string $name = '2026-2027', bool $current = true): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => $current,
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

    private function createExam(Organization $organization, AcademicYear $year, string $name = 'Term 1'): Exam
    {
        return Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => $name,
            'exam_type' => 'term_exam',
            'publish_status' => 'draft',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-25',
            'status' => 'scheduled',
        ]);
    }

    private function createSchedule(
        Exam $exam,
        SchoolClass $class,
        Subject $subject,
        string $date = '2026-09-14',
        string $startTime = '08:30:00',
        string $endTime = '10:30:00',
        ?string $room = '101'
    ): ExamSchedule {
        return ExamSchedule::query()->create([
            'exam_id' => $exam->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'exam_date' => $date,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'room_number' => $room,
            'max_marks' => 100,
            'passing_marks' => 33,
        ]);
    }
}