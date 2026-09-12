<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\SchoolEvent;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class S10ParentPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_view_parent_portal(): void
    {
        [$organization, $studentUser] = $this->setupParentContext();

        $this->actingAs($studentUser)
            ->get('/parent-portal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ParentPortal')
                ->has('children')
                ->has('selectedStudentId')
                ->has('tabs.calendar')
                ->has('tabs.timetable')
                ->has('tabs.attendance')
                ->has('tabs.exams')
                ->has('tabs.ptm')
                ->has('tabs.osm')
                ->has('tabs.classwork')
                ->has('tabs.transactions')
                ->has('tabs.messages')
                ->has('tabs.transport')
                ->has('tabs.library')
                ->has('tabs.visits')
                ->has('tabs.studyCenter')
                ->has('tabs.health')
                ->has('tabs.liveClasses')
            );
    }

    public function test_child_switch_selects_requested_student(): void
    {
        [$organization, $studentUser] = $this->setupParentContext();

        $secondChild = $this->createStudent($organization, $this->activeYear, $this->class, $studentUser->id, 'ADM-2002');

        $this->actingAs($studentUser)
            ->get('/parent-portal?student='.$secondChild->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ParentPortal')
                ->where('selectedStudentId', (string) $secondChild->id)
                ->has('children', 2)
            );
    }

    public function test_portal_surfaces_calendar_and_attendance_data(): void
    {
        [$organization, $studentUser, $student] = $this->setupParentContext();

        SchoolEvent::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Annual Day',
            'description' => 'School annual day celebration',
            'type' => 'cultural',
            'start_date' => '2026-12-18',
            'end_date' => '2026-12-18',
            'start_time' => '10:00',
            'is_holiday' => false,
            'created_by' => $studentUser->id,
        ]);

        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $this->class->id,
            'date' => '2026-09-01',
            'status' => 'present',
            'marked_by' => $studentUser->id,
        ]);
        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $this->class->id,
            'date' => '2026-09-02',
            'status' => 'absent',
            'marked_by' => $studentUser->id,
        ]);

        $this->actingAs($studentUser)
            ->get('/parent-portal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ParentPortal')
                ->has('tabs.calendar', 1)
                ->where('tabs.calendar.0.title', 'Annual Day')
                ->has('tabs.attendance.records', 2)
                ->where('tabs.attendance.summary.attendedDays', 1)
                ->where('tabs.attendance.summary.absent', 1)
            );
    }

    public function test_staff_cannot_access_parent_portal(): void
    {
        $organization = $this->createOrganization();
        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/parent-portal')
            ->assertForbidden();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/parent-portal')->assertRedirect(route('login'));
    }

    private function setupParentContext(): array
    {
        $organization = $this->createOrganization();
        $studentUser = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'student',
            'status' => 'active',
        ]);
        [$academicYear, $class] = $this->seedStudentContext($organization);
        $student = $this->createStudent($organization, $academicYear, $class, $studentUser->id, 'ADM-1001');
        $this->activeYear = $academicYear;
        $this->class = $class;

        return [$organization, $studentUser, $student];
    }

    private function seedStudentContext(Organization $organization): array
    {
        $academicYear = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 40,
            'status' => 'active',
        ]);

        return [$academicYear, $class];
    }

    private function createStudent(Organization $organization, $academicYear, SchoolClass $class, ?int $userId, string $admissionNo): Student
    {
        static $rollCounter = 0;
        $rollCounter++;

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'roll_number' => (string) $rollCounter,
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'user_id' => $userId,
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'session' => $academicYear->name,
            'roll_number' => (string) $rollCounter,
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        return $student;
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'S10 Parent Portal School '.$counter,
            'slug' => 's10-parent-portal-school-'.$counter,
            'address' => '123 Main Street',
            'contact_number' => '9876543210',
            'email' => 'admin-'.$counter.'@example.com',
            'password' => '12345678',
            'time_zone' => 'Asia/Kolkata',
            'locale' => 'en',
            'status' => 'active',
        ]);
    }
}