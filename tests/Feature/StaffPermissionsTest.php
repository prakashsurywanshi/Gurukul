<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LessonPlan;
use App\Models\Organization;
use App\Models\Role;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_access_staff_management(): void
    {
        $organization = $this->createOrganization();

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->get('/staff')
            ->assertOk();
    }

    public function test_teacher_cannot_access_staff_management(): void
    {
        $organization = $this->createOrganization();

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->get('/staff')
            ->assertForbidden();
    }

    public function test_teacher_can_only_manage_own_lesson_plans(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $academicYear = $this->createAcademicYear($organization);

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $otherTeacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'class_teacher_id' => $teacher->id,
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'theory',
        ]);

        $ownTimetable = Timetable::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day' => 'monday',
            'period_code' => 'p1',
            'period_order' => 1,
            'start_time' => '08:30',
            'end_time' => '09:15',
            'room_number' => '101',
            'period_type' => 'lecture',
        ]);

        $otherTimetable = Timetable::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $otherTeacher->id,
            'day' => 'monday',
            'period_code' => 'p2',
            'period_order' => 2,
            'start_time' => '09:20',
            'end_time' => '10:05',
            'room_number' => '101',
            'period_type' => 'lecture',
        ]);

        $otherPlan = LessonPlan::query()->create([
            'organization_id' => $organization->id,
            'timetable_id' => $otherTimetable->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $otherTeacher->id,
            'lesson_date' => '2026-05-24',
            'lesson_title' => 'Other Teacher Plan',
            'topic' => 'Other topic',
            'status' => 'planned',
            'created_by' => $otherTeacher->id,
            'updated_by' => $otherTeacher->id,
        ]);

        $this->actingAs($teacher)
            ->post('/lesson-plan', [
                'timetableEntryId' => $ownTimetable->id,
                'lessonDate' => '2026-05-25',
                'lessonTitle' => 'Algebra',
                'topic' => 'Linear equations',
                'status' => 'planned',
            ])
            ->assertRedirect('/lesson-plan');

        $this->assertDatabaseHas('lesson_plans', [
            'organization_id' => $organization->id,
            'timetable_id' => $ownTimetable->id,
            'teacher_id' => $teacher->id,
            'lesson_title' => 'Algebra',
        ]);

        $this->actingAs($teacher)
            ->post('/lesson-plan', [
                'timetableEntryId' => $otherTimetable->id,
                'lessonDate' => '2026-05-25',
                'lessonTitle' => 'Blocked',
                'topic' => 'Not allowed',
                'status' => 'planned',
            ])
            ->assertForbidden();

        $this->actingAs($teacher)
            ->delete("/lesson-plan/{$otherPlan->id}")
            ->assertForbidden();
    }

    public function test_teacher_cannot_mutate_timetables_even_if_permission_record_allows_it(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $academicYear = $this->createAcademicYear($organization);

        $teacherRole = Role::query()
            ->where('organization_id', $organization->id)
            ->where('slug', 'teacher')
            ->firstOrFail();

        $teacherRole->permissions()
            ->where('feature', 'Class Time Table')
            ->update([
                'can_view' => true,
                'can_add' => true,
                'can_edit' => true,
                'can_delete' => true,
            ]);

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'class_teacher_id' => $teacher->id,
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Science',
            'code' => 'SCI',
            'type' => 'theory',
        ]);

        $this->actingAs($teacher)
            ->post('/class-time-table', [
                'class_id' => $class->id,
                'day' => 'Monday',
                'period_code' => 'p1',
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'room_number' => '101',
                'start_time' => '08:30',
                'end_time' => '09:15',
            ])
            ->assertForbidden();
    }

    public function test_teacher_can_only_manage_attendance_for_own_classes(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $academicYear = $this->createAcademicYear($organization);

        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $otherTeacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $ownClass = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'class_teacher_id' => $teacher->id,
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $otherClass = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'B',
            'class_teacher_id' => $otherTeacher->id,
            'room_number' => '102',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $ownStudent = $this->createStudentForClass($organization, $academicYear, $ownClass, 'ADM-OWN-1', 'One');
        $otherStudent = $this->createStudentForClass($organization, $academicYear, $otherClass, 'ADM-OTH-1', 'Two');

        $this->actingAs($teacher)
            ->get('/attendance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AttendanceManagement')
                ->where('classRecords', [
                    [
                        'id' => $ownClass->id,
                        'name' => '10',
                        'section' => 'A',
                    ],
                ])
                ->where('studentRecords', [
                    [
                        'id' => (string) $ownStudent->id,
                        'class_id' => $ownClass->id,
                        'admission_no' => 'ADM-OWN-1',
                        'first_name' => 'Student',
                        'last_name' => 'One',
                        'class' => '10',
                        'section' => 'A',
                        'roll_number' => '1',
                    ],
                ])
            );

        $this->actingAs($teacher)
            ->post('/attendance', [
                'class_id' => $ownClass->id,
                'date' => '2026-05-25',
                'entries' => [
                    [
                        'student_id' => $ownStudent->id,
                        'status' => 'present',
                    ],
                ],
            ])
            ->assertRedirect('/attendance');

        $this->assertDatabaseHas('attendance', [
            'organization_id' => $organization->id,
            'student_id' => $ownStudent->id,
            'class_id' => $ownClass->id,
            'date' => '2026-05-25 00:00:00',
            'status' => 'present',
            'marked_by' => $teacher->id,
        ]);

        $this->actingAs($teacher)
            ->post('/attendance', [
                'class_id' => $otherClass->id,
                'date' => '2026-05-25',
                'entries' => [
                    [
                        'student_id' => $otherStudent->id,
                        'status' => 'absent',
                    ],
                ],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('attendance', [
            'organization_id' => $organization->id,
            'student_id' => $otherStudent->id,
            'class_id' => $otherClass->id,
            'date' => '2026-05-25',
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

    private function createStudentForClass(
        Organization $organization,
        AcademicYear $academicYear,
        SchoolClass $class,
        string $admissionNo,
        string $lastName
    ): Student {
        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'roll_number' => '1',
            'first_name' => 'Student',
            'last_name' => $lastName,
            'date_of_birth' => '2012-01-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'session' => $academicYear->name,
            'roll_number' => '1',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        return $student;
    }
}
