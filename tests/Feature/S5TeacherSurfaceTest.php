<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Lead;
use App\Models\LeadPipelineStage;
use App\Models\LeadSource;
use App\Models\Organization;
use App\Models\PtmAppointment;
use App\Models\PtmSession;
use App\Models\SchoolClass;
use App\Models\StaffLoan;
use App\Models\Student;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class S5TeacherSurfaceTest extends TestCase
{
    use RefreshDatabase;

    private StaffPermissionService $permissionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->permissionService = app(StaffPermissionService::class);
    }

    public function test_teacher_can_view_ptm_record_page(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->actingAs($teacher)
            ->get('/ptm/record')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/PtmRecord'));
    }

    public function test_teacher_can_view_ptm_followups_page(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->actingAs($teacher)
            ->get('/ptm/followups')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/PtmFollowups'));
    }

    public function test_teacher_can_record_appointment_attendance(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();
        $session = $this->createSession($organization, $teacher);
        $student = $this->createStudent($organization);
        $appointment = $this->createAppointment($session, $student, $teacher);

        $this->actingAs($teacher)
            ->patch("/ptm/appointments/{$appointment->id}/record", [
                'status' => 'checked_in',
                'remarks' => 'Good progress',
            ])
            ->assertRedirect();

        $fresh = $appointment->fresh();
        $this->assertSame('checked_in', $fresh->status);
        $this->assertSame('Good progress', $fresh->remarks);
    }

    public function test_teacher_followup_toggle_works(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();
        $session = $this->createSession($organization, $teacher);
        $student = $this->createStudent($organization);
        $appointment = PtmAppointment::query()->create([
            'organization_id' => $organization->id,
            'ptm_session_id' => $session->id,
            'student_id' => $student->id,
            'parent_name' => 'Ramesh Patil',
            'status' => 'completed',
            'follow_up_required' => true,
            'follow_up_due' => '2026-06-10',
            'created_by' => $teacher->id,
        ]);

        $this->actingAs($teacher)
            ->patch("/ptm/appointments/{$appointment->id}/follow-up", ['done' => true])
            ->assertRedirect();

        $this->assertNotNull($appointment->fresh()->follow_up_completed_at);

        $this->actingAs($teacher)
            ->patch("/ptm/appointments/{$appointment->id}/follow-up", ['done' => false])
            ->assertRedirect();

        $this->assertNull($appointment->fresh()->follow_up_completed_at);
    }

    public function test_survey_mine_returns_active_surveys_for_teacher(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        Survey::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Teaching Feedback',
            'status' => 'active',
            'audience' => 'all',
        ]);

        $this->actingAs($teacher)
            ->get('/survey/mine')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Surveys')
                ->where('mineMode', true)
                ->has('surveys', 1)
            );
    }

    public function test_survey_index_still_requires_admin_for_teacher(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->actingAs($teacher)
            ->get('/surveys')
            ->assertForbidden();
    }

    public function test_my_loans_only_shows_own_loans(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();
        $otherUser = $this->createStaff($organization, 'receptionist');

        StaffLoan::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $teacher->id,
            'loan_reason' => 'Emergency',
            'principal_amount' => 50000,
            'interest_rate' => 12,
            'tenure_months' => 12,
            'monthly_emi' => 4500,
            'start_date' => '2026-04-01',
            'paid_emis' => 5,
            'status' => 'active',
        ]);

        StaffLoan::query()->create([
            'organization_id' => $organization->id,
            'staff_user_id' => $otherUser->id,
            'loan_reason' => 'Travel',
            'principal_amount' => 30000,
            'interest_rate' => 10,
            'tenure_months' => 6,
            'monthly_emi' => 5500,
            'start_date' => '2026-05-01',
            'paid_emis' => 2,
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/staff/loans/mine')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/MyLoans')
                ->has('loans', 1)
            );
    }

    public function test_lesson_plan_review_page_for_teacher(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->actingAs($teacher)
            ->get('/lesson-plan/review')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/LessonPlanReview'));
    }

    public function test_lesson_plan_reports_page_for_teacher(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->actingAs($teacher)
            ->get('/lesson-plan/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/LessonPlanReports')
                ->has('summary.total')
            );
    }

    public function test_teacher_feedback_management_view_permission_after_catalog_flip(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->assertTrue(
            $this->permissionService->allows($teacher, 'Feedback Management', 'view')
        );
    }

    public function test_teacher_profile_view_permission_for_my_loans(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->assertTrue(
            $this->permissionService->allows($teacher, 'Profile', 'view')
        );
    }

    public function test_teacher_lesson_plan_view_permission(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->assertTrue(
            $this->permissionService->allows($teacher, 'Lesson Plan', 'view')
        );
    }

    public function test_teacher_admission_leads_view_permission_after_flip(): void
    {
        [$organization, $teacher] = $this->setupTeacherWithOrg();

        $this->assertTrue(
            $this->permissionService->allows($teacher, 'Admission Leads', 'view')
        );
    }

    private function setupTeacherWithOrg(): array
    {
        $organization = $this->createOrganization();
        $this->permissionService->ensureRolesExist($organization);
        $teacher = $this->createStaff($organization, 'teacher');

        return [$organization, $teacher];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'S5 Teacher Surface School '.$counter,
            'slug' => 's5-teacher-surface-school-'.$counter,
            'address' => '123 Main Street',
            'contact_number' => '9876543210',
            'email' => 'admin-'.$counter.'@example.com',
            'password' => '12345678',
            'time_zone' => 'Asia/Kolkata',
            'locale' => 'en',
            'status' => 'active',
        ]);
    }

    private function createStaff(Organization $organization, string $role): User
    {
        static $staffCounter = 0;
        $staffCounter++;

        return User::query()->create([
            'name' => ucfirst($role).' Staff '.$staffCounter,
            'email' => $role.'-staff-'.$staffCounter.'@example.com',
            'password' => '12345678',
            'role' => $role,
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);
    }

    private function createStudent(Organization $organization): Student
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        return Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-S5-'.$organization->id,
            'first_name' => 'Aarav',
            'last_name' => 'Patil',
            'date_of_birth' => '2013-07-19',
            'gender' => 'male',
            'admission_date' => '2026-04-05',
        ]);
    }

    private function createSession(Organization $organization, User $user): PtmSession
    {
        return PtmSession::query()->create([
            'organization_id' => $organization->id,
            'title' => 'S5 PTM Session',
            'description' => null,
            'date' => '2026-05-24',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'location' => 'Class 10A',
            'status' => 'scheduled',
            'created_by' => $user->id,
        ]);
    }

    private function createAppointment(PtmSession $session, Student $student, User $user): PtmAppointment
    {
        return PtmAppointment::query()->create([
            'organization_id' => $session->organization_id,
            'ptm_session_id' => $session->id,
            'student_id' => $student->id,
            'parent_name' => 'Suresh Patil',
            'status' => 'booked',
            'created_by' => $user->id,
        ]);
    }
}