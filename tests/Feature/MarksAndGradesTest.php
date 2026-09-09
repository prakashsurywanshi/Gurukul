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
use App\Services\GradingScaleService;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MarksAndGradesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_manage_grades_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/grades')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ManageGrades')
                ->has('gradeScale', 7)
                ->where('gradeScale.0.grade', 'A+')
                ->where('gradeScale.0.min', 90)
                ->where('gradeScale.0.remark', 'Outstanding')
                ->where('isDefault', true)
            );
    }

    public function test_admin_can_save_custom_grading_scale(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $rows = [
            ['grade' => 'A', 'min' => 85, 'max' => 100, 'point' => 4.0, 'remark' => 'Excellent'],
            ['grade' => 'F', 'min' => 0, 'max' => 84, 'point' => 0.0, 'remark' => 'Needs Work'],
        ];

        $this->actingAs($admin)
            ->post('/grades', ['rows' => $rows])
            ->assertRedirect();

        $saved = $organization->fresh()->settings[GradingScaleService::SETTINGS_KEY];
        $this->assertCount(2, $saved);
        $this->assertSame('A', $saved[0]['grade']);
        $this->assertSame('F', $saved[1]['grade']);
    }

    public function test_saved_grading_scale_reflects_on_manage_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        GradingScaleService::saveScale($organization, [
            ['grade' => 'A', 'min' => 85, 'max' => 100, 'point' => 4.0, 'remark' => 'Excellent'],
            ['grade' => 'F', 'min' => 0, 'max' => 84, 'point' => 0.0, 'remark' => 'Needs Work'],
        ]);

        $this->actingAs($admin)
            ->get('/grades')
            ->assertInertia(fn ($page) => $page
                ->has('gradeScale', 2)
                ->where('gradeScale.0.grade', 'A')
                ->where('isDefault', false)
            );
    }

    public function test_receptionist_cannot_access_manage_grades(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/grades')
            ->assertForbidden();

        $this->actingAs($receptionist)
            ->post('/grades', ['rows' => []])
            ->assertForbidden();
    }

    public function test_schedule_setup_page_lists_assigned_subjects(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->assignSubject($class, $subject);

        $this->actingAs($admin)
            ->get("/exam-schedule?exam={$exam->id}&class={$class->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ExamScheduleSetup')
                ->has('rows', 1)
                ->where('rows.0.subject', 'Mathematics')
                ->where('rows.0.maxMarks', 100)
                ->where('rows.0.passingMarks', 33)
                ->where('rows.0.scheduled', false)
                ->where('selectedExamId', $exam->id)
                ->where('selectedClassId', $class->id)
            );
    }

    public function test_schedule_setup_lists_subjects_out_of_scope(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $exam = $this->createExam($organization, $year);
        $this->createSubject($organization, 'Science', 'SCI');
        $this->createSubject($organization, 'English', 'ENG');

        $this->actingAs($admin)
            ->get("/exam-schedule?exam={$exam->id}&class={$class->id}")
            ->assertInertia(fn ($page) => $page
                ->has('rows', 0)
                ->where('subjectsOutOfScope', ['English', 'Science'])
            );
    }

    public function test_schedule_setup_saves_and_updates_schedule(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->assignSubject($class, $subject);

        $this->actingAs($admin)
            ->post('/exam-schedule', [
                'exam_id' => $exam->id,
                'class_id' => $class->id,
                'rows' => [
                    [
                        'subject_id' => $subject->id,
                        'exam_date' => '2026-09-14',
                        'start_time' => '08:30',
                        'end_time' => '10:30',
                        'room_number' => '101',
                        'max_marks' => 100,
                        'passing_marks' => 40,
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(1, ExamSchedule::query()->count());
        $this->assertDatabaseHas('exam_schedules', [
            'exam_id' => $exam->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'max_marks' => 100,
            'passing_marks' => 40,
            'room_number' => '101',
        ]);
        $this->assertSame('2026-09-14', $exam->fresh()->schedules()->where('subject_id', $subject->id)->first()->exam_date->format('Y-m-d'));
        $freshExam = $exam->fresh();
        $this->assertSame('2026-09-14', $freshExam->start_date->format('Y-m-d'));
        $this->assertSame('2026-09-14', $freshExam->end_date->format('Y-m-d'));

        $this->actingAs($admin)
            ->post('/exam-schedule', [
                'exam_id' => $exam->id,
                'class_id' => $class->id,
                'rows' => [
                    [
                        'subject_id' => $subject->id,
                        'exam_date' => '2026-09-15',
                        'start_time' => '09:00',
                        'end_time' => '11:00',
                        'room_number' => '202',
                        'max_marks' => 80,
                        'passing_marks' => 32,
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(1, ExamSchedule::query()->count());
        $this->assertDatabaseHas('exam_schedules', [
            'exam_id' => $exam->id,
            'subject_id' => $subject->id,
            'max_marks' => 80,
            'room_number' => '202',
        ]);
        $this->assertSame('2026-09-15', $exam->fresh()->schedules()->where('subject_id', $subject->id)->first()->exam_date->format('Y-m-d'));
    }

    public function test_schedule_setup_ignores_subjects_not_assigned(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);

        $this->actingAs($admin)
            ->post('/exam-schedule', [
                'exam_id' => $exam->id,
                'class_id' => $class->id,
                'rows' => [
                    [
                        'subject_id' => $subject->id,
                        'exam_date' => '2026-09-14',
                        'start_time' => '08:30',
                        'end_time' => '10:30',
                        'room_number' => null,
                        'max_marks' => 100,
                        'passing_marks' => 33,
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(0, ExamSchedule::query()->count());
    }

    public function test_enter_marks_page_returns_students_and_subjects(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->assignSubject($class, $subject);
        $schedule = $this->createSchedule($exam, $class, $subject);
        $student = $this->createStudent($organization, $class, $year);

        $this->actingAs($admin)
            ->get("/exams/marks/entry?exam={$exam->id}&class={$class->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/EnterMarks')
                ->has('subjects', 1)
                ->where('subjects.0.scheduleId', $schedule->id)
                ->where('subjects.0.subject', 'Mathematics')
                ->where('subjects.0.maxMarks', 100)
                ->where('subjects.0.passingMarks', 33)
                ->has('students', 1)
                ->where('students.0.name', 'Aarav Mehta')
                ->where('students.0.rollNumber', '5')
                ->where('students.0.marks.0', null)
            );
    }

    public function test_enter_marks_saves_and_grades_results(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->assignSubject($class, $subject);
        $schedule = $this->createSchedule($exam, $class, $subject);
        $student = $this->createStudent($organization, $class, $year);

        $this->actingAs($admin)
            ->post('/exams/marks/save', [
                'schedule_id' => $schedule->id,
                'values' => [
                    ['student_id' => $student->id, 'marks_obtained' => 92, 'is_absent' => false],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(1, ExamResult::query()->count());
        $this->assertDatabaseHas('exam_results', [
            'exam_schedule_id' => $schedule->id,
            'student_id' => $student->id,
            'obtained_marks' => 92.00,
            'grade' => 'A+',
            'is_absent' => false,
        ]);
    }

    public function test_enter_marks_records_absent_student(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $year = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $year);
        $subject = $this->createSubject($organization);
        $exam = $this->createExam($organization, $year);
        $this->assignSubject($class, $subject);
        $schedule = $this->createSchedule($exam, $class, $subject);
        $student = $this->createStudent($organization, $class, $year);

        $this->actingAs($admin)
            ->post('/exams/marks/save', [
                'schedule_id' => $schedule->id,
                'values' => [
                    ['student_id' => $student->id, 'marks_obtained' => null, 'is_absent' => true],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('exam_results', [
            'exam_schedule_id' => $schedule->id,
            'student_id' => $student->id,
            'is_absent' => true,
            'grade' => 'F',
        ]);
    }

    public function test_cannot_save_marks_for_other_organization_schedule(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherYear = $this->createAcademicYear($otherOrganization);
        $otherClass = $this->createClass($otherOrganization, $otherYear);
        $otherSubject = $this->createSubject($otherOrganization);
        $otherExam = $this->createExam($otherOrganization, $otherYear);
        $otherSchedule = $this->createSchedule($otherExam, $otherClass, $otherSubject);
        $otherStudent = $this->createStudent($otherOrganization, $otherClass, $otherYear);

        $this->actingAs($admin)
            ->post('/exams/marks/save', [
                'schedule_id' => $otherSchedule->id,
                'values' => [
                    ['student_id' => $otherStudent->id, 'marks_obtained' => 80, 'is_absent' => false],
                ],
            ])
            ->assertRedirect();

        $this->assertSame(0, ExamResult::query()->where('student_id', $otherStudent->id)->count());
    }

    public function test_receptionist_cannot_access_enter_marks(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/exams/marks/entry')
            ->assertForbidden();
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

    private function createSubject(Organization $organization, string $name = 'Mathematics', string $code = 'MATH'): Subject
    {
        return Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'code' => $code,
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

    private function assignSubject(SchoolClass $class, Subject $subject): void
    {
        DB::table('class_subject')->insert([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
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

    private function createStudent(Organization $organization, SchoolClass $class, AcademicYear $year): Student
    {
        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-1001',
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2025-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'session' => $year->name,
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2025-04-10',
        ]);

        return $student;
    }
}