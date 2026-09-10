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

class PtmFollowUpTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_appointment_saves_remarks_and_follow_up_fields(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $session = $this->createSession($organization, $admin);
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post("/ptm/{$session->id}/appointments", [
                'student_id' => $student->id,
                'parent_name' => 'Ramesh Patil',
                'status' => 'completed',
                'remarks' => 'Needs extra attention in maths',
                'follow_up_required' => true,
                'follow_up_due' => '2026-06-10',
            ])
            ->assertRedirect();

        $appointment = PtmAppointment::query()->where('ptm_session_id', $session->id)->first();
        $this->assertNotNull($appointment);
        $this->assertSame('Needs extra attention in maths', $appointment->remarks);
        $this->assertTrue($appointment->follow_up_required);
        $this->assertSame('2026-06-10', $appointment->follow_up_due->format('Y-m-d'));
        $this->assertNull($appointment->follow_up_completed_at);
    }

    public function test_update_appointment_updates_remarks_and_follow_up(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $session = $this->createSession($organization, $admin);
        $student = $this->createStudent($organization);
        $appointment = $this->createAppointment($session, $student, $admin);

        $this->actingAs($admin)
            ->patch("/ptm/appointments/{$appointment->id}", [
                'student_id' => $student->id,
                'parent_name' => 'Ramesh Patil',
                'status' => 'completed',
                'remarks' => 'Improved, no follow-up needed',
                'follow_up_required' => false,
            ])
            ->assertRedirect();

        $fresh = $appointment->fresh();
        $this->assertSame('Improved, no follow-up needed', $fresh->remarks);
        $this->assertFalse($fresh->follow_up_required);
        $this->assertNull($fresh->follow_up_completed_at);
    }

    public function test_teacher_can_mark_follow_up_done_and_reopen(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $session = $this->createSession($organization, $admin);
        $student = $this->createStudent($organization);
        $appointment = PtmAppointment::query()->create([
            'organization_id' => $organization->id,
            'ptm_session_id' => $session->id,
            'student_id' => $student->id,
            'parent_name' => 'Ramesh Patil',
            'status' => 'completed',
            'remarks' => 'Needs revision',
            'follow_up_required' => true,
            'follow_up_due' => '2026-06-10',
            'created_by' => $admin->id,
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

    public function test_follow_up_toggle_is_scoped_to_organization(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($other, 'admin');
        $session = $this->createSession($organization, $admin);
        $student = $this->createStudent($organization);
        $appointment = $this->createAppointment($session, $student, $admin);

        $this->actingAs($otherAdmin)
            ->patch("/ptm/appointments/{$appointment->id}/follow-up", ['done' => true])
            ->assertForbidden();
    }

    public function test_ptm_page_exposes_remarks_and_follow_up(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $session = $this->createSession($organization, $admin);
        $student = $this->createStudent($organization);
        $appointment = PtmAppointment::query()->create([
            'organization_id' => $organization->id,
            'ptm_session_id' => $session->id,
            'student_id' => $student->id,
            'parent_name' => 'Ramesh Patil',
            'status' => 'completed',
            'remarks' => 'Needs revision',
            'follow_up_required' => true,
            'follow_up_due' => '2026-06-10',
            'follow_up_completed_at' => now(),
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/ptm?session_id='.$session->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PtmSessions')
                ->where('selectedSession.appointments.0.remarks', 'Needs revision')
                ->where('selectedSession.appointments.0.follow_up_required', true)
                ->where('selectedSession.appointments.0.follow_up_due', '2026-06-10')
                ->where('selectedSession.appointments.0.id', (string) $appointment->id)
            );
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
            'status' => 'scheduled',
            'created_by' => $admin->id,
        ]);
    }

    private function createAppointment(PtmSession $session, Student $student, User $admin): PtmAppointment
    {
        return PtmAppointment::query()->create([
            'organization_id' => $session->organization_id,
            'ptm_session_id' => $session->id,
            'student_id' => $student->id,
            'parent_name' => 'Ramesh Patil',
            'status' => 'booked',
            'created_by' => $admin->id,
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
            'admission_no' => 'ADM-PTM-'.$organization->id,
            'first_name' => 'Aarav',
            'last_name' => 'Patil',
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
            'name' => 'PTM Follow Up School '.$counter,
            'slug' => 'ptm-follow-up-school-'.$counter,
            'email' => 'ptm-follow-up-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => 'ptm-'.$role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}