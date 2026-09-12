<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\PtmAppointment;
use App\Models\PtmSession;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PtmReportsGuideTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_ptm_guide(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/ptm/guide')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/PtmGuide'));
    }

    public function test_teacher_can_view_ptm_guide_and_reports(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/ptm/guide')->assertOk();
        $this->actingAs($teacher)->get('/ptm/reports')->assertOk();
    }

    public function test_reports_page_rolls_up_attendance_remarks_and_follow_ups(): void
    {
        [$organization, $admin] = $this->seedRole();
        $session = $this->createSession($organization, $admin);
        $studentA = $this->createStudent($organization, 'Aarav', 'Patil', 1);
        $studentB = $this->createStudent($organization, 'Kavya', 'Sharma', 2);
        $studentC = $this->createStudent($organization, 'Rohan', 'Verma', 3);

        $this->createAppointment($session, $studentA, $admin, 'checked_in', 'Shows steady progress', true);
        $this->createAppointment($session, $studentB, $admin, 'completed', null, true);
        $this->createAppointment($session, $studentC, $admin, 'absent', null, false);

        $this->actingAs($admin)
            ->get('/ptm/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PtmReports')
                ->where('summary.appointments', 3)
                ->where('summary.present', 2)
                ->where('summary.absent', 1)
                ->where('summary.attendanceRate', 67)
                ->where('summary.remarks', 1)
                ->where('summary.pendingFollowUps', 2)
                ->where('sessions.0.total', 3)
                ->where('sessions.0.present', 2)
                ->where('sessions.0.absent', 1)
                ->where('sessions.0.remarks', 1)
                ->where('sessions.0.followUps', 2)
            );
    }

    public function test_empty_reports_show_zero_summary(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/ptm/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('summary.sessions', 0)
                ->where('summary.appointments', 0)
                ->where('summary.attendanceRate', 0)
                ->where('sessions', fn ($value) => count($value) === 0)
            );
    }

    private function seedRole(): array
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    private function createSession(Organization $organization, User $admin): PtmSession
    {
        return PtmSession::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Term 1 PTM',
            'description' => null,
            'date' => '2026-05-24',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'location' => 'Class 2B',
            'status' => 'completed',
            'created_by' => $admin->id,
        ]);
    }

    private function createAppointment(
        PtmSession $session,
        Student $student,
        User $admin,
        string $status,
        ?string $remarks,
        bool $followUpRequired
    ): PtmAppointment {
        return PtmAppointment::query()->create([
            'organization_id' => $session->organization_id,
            'ptm_session_id' => $session->id,
            'student_id' => $student->id,
            'parent_name' => 'Ramesh Patil',
            'status' => $status,
            'remarks' => $remarks,
            'follow_up_required' => $followUpRequired,
            'created_by' => $admin->id,
        ]);
    }

    private function createStudent(Organization $organization, string $firstName = 'Aarav', string $lastName = 'Patil', int $seq = 1): Student
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
            'admission_no' => 'ADM-PTM-'.$organization->id.'-'.$seq,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '2013-07-19',
            'gender' => 'male',
            'admission_date' => '2026-04-05',
        ]);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'PTM Reports School '.$counter,
            'slug' => 'ptm-reports-school-'.$counter,
            'email' => 'ptm-reports-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
        ]);
    }
}