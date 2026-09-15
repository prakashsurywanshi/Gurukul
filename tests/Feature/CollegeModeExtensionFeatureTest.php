<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Batch;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Lecture;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollegeModeExtensionFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_college_admin_can_view_courses_page(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $this->actingAs($admin)
            ->get('/college/courses')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/college/CourseManagement')
                ->has('courses', 0)
            );
    }

    public function test_college_admin_can_create_course(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $this->actingAs($admin)
            ->post('/college/courses', [
                'name' => 'B.Sc Computer Science',
                'code' => 'BSC-CS',
                'department' => 'Science',
                'duration_years' => 3,
                'total_semesters' => 6,
                'description' => 'Three-year computer science program.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('courses', [
            'organization_id' => $org->id,
            'code' => 'BSC-CS',
            'duration_years' => 3,
        ]);
    }

    public function test_non_college_org_gets_403_on_courses(): void
    {
        [$org, $admin] = $this->createSchoolOrgWithAdmin();

        $this->actingAs($admin)
            ->get('/college/courses')
            ->assertStatus(403);
    }

    public function test_course_code_uniqueness_within_org_is_enforced(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Sc Physics',
            'code' => 'BSC-PHY',
        ]);

        $this->actingAs($admin)
            ->post('/college/courses', [
                'name' => 'B.Sc Advanced Physics',
                'code' => 'BSC-PHY',
            ])
            ->assertSessionHasErrors(['code']);
    }

    public function test_college_admin_can_update_course(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $course = Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Com',
            'code' => 'BCOM',
        ]);

        $this->actingAs($admin)
            ->patch("/college/courses/{$course->id}", [
                'name' => 'B.Com (Honours)',
                'code' => 'BCOM-H',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('courses', [
            'id' => $course->id,
            'name' => 'B.Com (Honours)',
            'code' => 'BCOM-H',
        ]);
    }

    public function test_college_admin_can_delete_course(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $course = Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Sc Chemistry',
            'code' => 'BSC-CHM',
        ]);

        $this->actingAs($admin)
            ->delete("/college/courses/{$course->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('courses', ['id' => $course->id]);
    }

    public function test_college_admin_can_add_batch_to_course(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $course = Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Sc CS',
            'code' => 'BSC-CS',
        ]);

        $this->actingAs($admin)
            ->post("/college/courses/{$course->id}/batches", [
                'name' => 'FY 2026',
                'start_date' => '2026-07-01',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('batches', [
            'course_id' => $course->id,
            'name' => 'FY 2026',
        ]);
    }

    public function test_college_admin_can_update_batch(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $course = Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Sc CS',
            'code' => 'BSC-CS',
        ]);

        $batch = Batch::query()->create([
            'organization_id' => $org->id,
            'course_id' => $course->id,
            'name' => 'FY 2026',
        ]);

        $this->actingAs($admin)
            ->patch("/college/batches/{$batch->id}", [
                'name' => 'FY 2026-A',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('batches', [
            'id' => $batch->id,
            'name' => 'FY 2026-A',
        ]);
    }

    public function test_college_admin_can_delete_batch(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $course = Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Sc CS',
            'code' => 'BSC-CS',
        ]);

        $batch = Batch::query()->create([
            'organization_id' => $org->id,
            'course_id' => $course->id,
            'name' => 'FY 2026',
        ]);

        $this->actingAs($admin)
            ->delete("/college/batches/{$batch->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('batches', ['id' => $batch->id]);
    }

    public function test_non_college_org_gets_403_on_lectures(): void
    {
        [$org, $admin] = $this->createSchoolOrgWithAdmin();

        $this->actingAs($admin)
            ->get('/college/lectures')
            ->assertStatus(403);
    }

    public function test_college_admin_can_view_lectures_page(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();
        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'A',
            'academic_year_id' => $org->selectedAcademicYear()?->id,
        ]);

        $this->actingAs($admin)
            ->get("/college/lectures?class_id={$class->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/college/LectureTimetable')
            );
    }

    public function test_college_admin_can_create_lecture(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'B',
            'academic_year_id' => $org->selectedAcademicYear()?->id,
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $org->id,
            'name' => 'Mathematics',
            'code' => 'MATH101',
        ]);

        $teacher = $this->createStaff($org, 'teacher');

        $this->actingAs($admin)
            ->post('/college/lectures', [
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'teacher_id' => $teacher->id,
                'day_of_week' => 0,
                'start_time' => '09:00',
                'end_time' => '10:00',
                'room' => 'Room 101',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lectures', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day_of_week' => 0,
        ]);
    }

    public function test_overlapping_lectures_are_rejected(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'C',
            'academic_year_id' => $org->selectedAcademicYear()?->id,
        ]);

        Lecture::query()->create([
            'organization_id' => $org->id,
            'class_id' => $class->id,
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '10:00',
        ]);

        $this->actingAs($admin)
            ->post('/college/lectures', [
                'class_id' => $class->id,
                'day_of_week' => 1,
                'start_time' => '09:30',
                'end_time' => '10:30',
            ])
            ->assertStatus(422);
    }

    public function test_college_admin_can_update_lecture(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'D',
            'academic_year_id' => $org->selectedAcademicYear()?->id,
        ]);

        $lecture = Lecture::query()->create([
            'organization_id' => $org->id,
            'class_id' => $class->id,
            'day_of_week' => 2,
            'start_time' => '11:00',
            'end_time' => '12:00',
        ]);

        $this->actingAs($admin)
            ->patch("/college/lectures/{$lecture->id}", [
                'class_id' => $class->id,
                'day_of_week' => 2,
                'start_time' => '10:00',
                'end_time' => '11:00',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lectures', [
            'id' => $lecture->id,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
    }

    public function test_college_admin_can_delete_lecture(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'E',
            'academic_year_id' => $org->selectedAcademicYear()?->id,
        ]);

        $lecture = Lecture::query()->create([
            'organization_id' => $org->id,
            'class_id' => $class->id,
            'day_of_week' => 3,
            'start_time' => '14:00',
            'end_time' => '15:00',
        ]);

        $this->actingAs($admin)
            ->delete("/college/lectures/{$lecture->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('lectures', ['id' => $lecture->id]);
    }

    public function test_exam_store_attaches_semester_id_when_provided(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $org->selectedAcademicYear()?->id,
            'name' => 'Semester 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => true,
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'A',
            'academic_year_id' => $org->selectedAcademicYear()?->id,
        ]);

        $this->actingAs($admin)
            ->post('/exams', [
                'name' => 'Mid Term',
                'publishStatus' => 'draft',
                'className' => 'FY',
                'section' => 'A',
                'semesterId' => $semester->id,
            ])
            ->assertRedirect();

        $exam = Exam::query()->where('organization_id', $org->id)->latest()->first();
        $this->assertNotNull($exam);
        $this->assertEquals($semester->id, $exam->semester_id);
    }

    public function test_exam_index_exposes_semesters_prop(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $org->selectedAcademicYear()?->id,
            'name' => 'Semester 2',
            'sem_no' => 2,
            'start_date' => now()->addMonths(6)->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => false,
        ]);

        $this->actingAs($admin)
            ->get('/exams')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('semesters', [
                    [
                        'id' => $semester->id,
                        'name' => 'Semester 2',
                        'sem_no' => 2,
                    ],
                ])
            );
    }

    public function test_exam_index_filter_by_semester(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $year = $org->selectedAcademicYear();
        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'Sem 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => false,
        ]);

        Exam::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'semester_id' => $semester->id,
            'name' => 'Sem Exam',
            'exam_type' => 'mid_term',
            'publish_status' => 'draft',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'status' => 'scheduled',
        ]);

        $this->actingAs($admin)
            ->get("/exams?semester={$semester->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('selectedSemester', $semester->id)
                ->has('examGroups', 1)
            );
    }

    public function test_exam_index_excludes_unfiltered_semester_when_filter_set(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $year = $org->selectedAcademicYear();
        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'Sem 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => false,
        ]);

        Exam::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'General Exam',
            'exam_type' => 'mid_term',
            'publish_status' => 'draft',
            'start_date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'status' => 'scheduled',
        ]);

        $this->actingAs($admin)
            ->get("/exams?semester={$semester->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('examGroups', 0)
            );
    }

    public function test_attendance_store_persists_semester_id(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $year = $org->selectedAcademicYear();
        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'Sem 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => true,
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'A',
            'academic_year_id' => $year?->id,
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'first_name' => 'Test',
            'last_name' => 'Student',
            'status' => 'active',
            'gender' => 'male',
            'admission_no' => 'NC-001',
            'date_of_birth' => '2000-01-01',
            'admission_date' => '2026-08-01',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'academic_year_id' => $year?->id,
            'class_id' => $class->id,
            'status' => 'active',
            'is_current' => true,
        ]);

        $this->actingAs($admin)
            ->post('/attendance', [
                'class_id' => $class->id,
                'date' => now()->toDateString(),
                'semester_id' => $semester->id,
                'entries' => [
                    ['student_id' => $student->id, 'status' => 'present'],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('attendance', [
            'student_id' => $student->id,
            'semester_id' => $semester->id,
            'status' => 'present',
        ]);
    }

    public function test_attendance_index_exposes_semesters_prop(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $year = $org->selectedAcademicYear();
        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'Sem 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => true,
        ]);

        $this->actingAs($admin)
            ->get('/attendance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('selectedSemester', null)
                ->has('semesters', 1)
            );
    }

    public function test_attendance_index_filter_by_semester(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $year = $org->selectedAcademicYear();
        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'Sem 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => false,
        ]);

        $this->actingAs($admin)
            ->get("/attendance?semester={$semester->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('selectedSemester', $semester->id)
            );
    }

    public function test_student_academic_history_accepts_course_and_batch(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $course = Course::query()->create([
            'organization_id' => $org->id,
            'name' => 'B.Sc CS',
            'code' => 'BSC-CS',
        ]);

        $batch = Batch::query()->create([
            'organization_id' => $org->id,
            'course_id' => $course->id,
            'name' => 'FY 2026',
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'first_name' => 'New',
            'last_name' => 'Student',
            'status' => 'active',
            'gender' => 'female',
            'admission_no' => 'NC-002',
            'date_of_birth' => '2000-02-02',
            'admission_date' => '2026-08-01',
        ]);

        $year = $org->selectedAcademicYear();

        $history = StudentAcademicHistory::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'academic_year_id' => $year?->id,
            'class_id' => null,
            'course_id' => $course->id,
            'batch_id' => $batch->id,
            'status' => 'active',
            'is_current' => true,
        ]);

        $this->assertNotNull($history->fresh()->course_id);
        $this->assertEquals($course->id, $history->course_id);
        $this->assertEquals($batch->id, $history->batch_id);
    }

    public function test_student_fee_import_persists_current_semester_id(): void
    {
        [$org, $admin] = $this->createCollegeOrgWithAdmin();

        $year = $org->selectedAcademicYear();
        $semester = Semester::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'name' => 'Sem 1',
            'sem_no' => 1,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_current' => true,
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'first_name' => 'Fee',
            'last_name' => 'Student',
            'status' => 'active',
            'gender' => 'male',
            'admission_no' => 'NC-FEE01',
            'date_of_birth' => '2000-03-03',
            'admission_date' => '2026-08-01',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'name' => 'FY',
            'section' => 'A',
            'academic_year_id' => $year?->id,
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'academic_year_id' => $year?->id,
            'class_id' => $class->id,
            'status' => 'active',
            'is_current' => true,
        ]);

        $student->forceFill(['class_id' => $class->id])->save();

        \App\Models\FeeStructure::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year?->id,
            'class_id' => $class->id,
            'fee_type' => 'Tuition Fee',
            'amount' => 10000,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->post('/fees/import', [
                'entries' => [
                    [
                        'studentIdentifier' => 'NC-FEE01',
                        'feeType' => 'Tuition Fee',
                        'amount' => 10000,
                        'month' => 'January',
                        'year' => 2026,
                        'dueDate' => '2026-01-31',
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('student_fees', [
            'student_id' => $student->id,
            'semester_id' => $semester->id,
            'amount' => 10000,
        ]);
    }

    private function createCollegeOrgWithAdmin(): array
    {
        $org = Organization::query()->create([
            'name' => 'Narayana College',
            'slug' => 'narayana-college',
            'email' => 'admin@narayana.test',
            'phone' => '9999000000',
            'address' => 'College Road',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
            'country' => 'India',
            'pincode' => '500001',
            'type' => 'college',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        AcademicYear::query()->create([
            'organization_id' => $org->id,
            'name' => '2026-2027',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $admin = $this->createStaff($org, 'admin');

        app(StaffPermissionService::class)->ensureRolesExist($org);

        return [$org, $admin];
    }

    private function createSchoolOrgWithAdmin(): array
    {
        $org = Organization::query()->create([
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
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        AcademicYear::query()->create([
            'organization_id' => $org->id,
            'name' => '2026-2027',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $admin = $this->createStaff($org, 'admin');

        app(StaffPermissionService::class)->ensureRolesExist($org);

        return [$org, $admin];
    }

    private function createStaff(Organization $org, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $org->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }
}