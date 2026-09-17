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

class SemesterFiltersCreditsFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(string $orgType = 'college', string $suffix = 'college'): array
    {
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Career College',
            'slug' => "semcred-{$suffix}",
            'email' => "admin@{$suffix}.test",
            'phone' => '5550004321',
            'address' => 'College Road',
            'status' => 'active',
            'type' => $orgType,
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'Career Admin',
            'email' => "principal@{$suffix}.test",
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organizationId,
            'name' => '2026-2027',
            'start_date' => '2026-06-01',
            'end_date' => '2027-04-30',
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$adminId, $organizationId, $academicYearId];
    }

    private function createSemester(int $orgId, int $yearId, int $semNo, string $start, string $end, string $name = ''): int
    {
        return DB::table('semesters')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'name' => $name !== '' ? $name : "Semester {$semNo}",
            'sem_no' => $semNo,
            'start_date' => $start,
            'end_date' => $end,
            'is_current' => $semNo === 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function seedStudent(int $orgId, int $classId, string $firstName): int
    {
        static $counter = 0;
        $counter++;

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $orgId,
            'class_id' => $classId,
            'admission_no' => 'SC-'.$counter,
            'roll_number' => (string) $counter,
            'first_name' => $firstName,
            'last_name' => 'Semester',
            'email' => $firstName.'@semcred.test',
            'date_of_birth' => '2005-04-01',
            'gender' => 'male',
            'admission_date' => '2026-06-01',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $studentId;
    }

    private function seedOrganizationUser(string $orgType = 'school', string $suffix = 'school'): array
    {
        $organization = Organization::query()->create([
            'name' => 'SemCred School',
            'slug' => 'semcred-'.$suffix,
            'email' => 'semcred-'.$suffix.'@example.com',
            'type' => $orgType,
            'status' => 'active',
        ]);

        $admin = User::query()->create([
            'organization_id' => $organization->id,
            'name' => 'SemCred Admin',
            'email' => 'admin-'.$suffix.'@semcred.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    public function test_reports_page_exposes_semester_options_and_selection(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();
        $sem1 = $this->createSemester($orgId, $yearId, 1, '2026-06-01', '2026-12-31');

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports?semester='.$sem1)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportsAnalytics')
                ->has('semesterOptions', 1)
                ->where('semesterOptions.0.value', (string) $sem1)
                ->where('selectedFilters.semester', (string) $sem1)
            );
    }

    public function test_reports_page_defaults_semester_to_all(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('selectedFilters.semester', 'all')
            );
    }

    public function test_attendance_export_respects_semester_date_window(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();
        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'name' => 'FY',
            'section' => 'A',
            'room_number' => 'R1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sem1 = $this->createSemester($orgId, $yearId, 1, '2026-06-01', '2026-06-30');
        $inside = $this->seedStudent($orgId, $classId, 'Inside');
        $outside = $this->seedStudent($orgId, $classId, 'Outside');

        DB::table('attendance')->insert([
            'organization_id' => $orgId,
            'class_id' => $classId,
            'student_id' => $inside,
            'date' => '2026-06-15',
            'status' => 'present',
            'marked_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('attendance')->insert([
            'organization_id' => $orgId,
            'class_id' => $classId,
            'student_id' => $outside,
            'date' => '2026-07-15',
            'status' => 'present',
            'marked_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs(User::query()->find($adminId))
            ->get('/reports/export-csv?module=attendance&month=2026-06&semester='.$sem1)
            ->assertOk();

        $this->assertStringContainsString('Inside', $response->streamedContent());
        $this->assertStringNotContainsString('Outside', $response->streamedContent());
    }

    public function test_saved_report_builder_exposes_semester_options(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();
        $this->createSemester($orgId, $yearId, 1, '2026-06-01', '2026-12-31');

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports/builder')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportBuilder')
                ->has('semesterOptions', 1)
            );
    }

    public function test_saved_report_persists_semester_filter(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();
        $sem1 = $this->createSemester($orgId, $yearId, 1, '2026-06-01', '2026-12-31');

        $this->actingAs(User::query()->find($adminId))
            ->post('/reports/builder', [
                'name' => 'Semester Attendance',
                'module' => 'attendance',
                'filters' => [
                    'session' => (string) $yearId,
                    'semester' => (string) $sem1,
                ],
            ])
            ->assertRedirect('/reports/builder');

        $filters = json_decode((string) DB::table('saved_reports')->value('filters'), true);
        $this->assertSame((string) $sem1, $filters['semester']);
    }

    public function test_run_saved_report_hydrates_semester_filter(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();
        $sem1 = $this->createSemester($orgId, $yearId, 1, '2026-06-01', '2026-12-31');

        $savedReportId = DB::table('saved_reports')->insertGetId([
            'organization_id' => $orgId,
            'name' => 'Sem Filtered',
            'module' => 'students',
            'filters' => json_encode([
                'session' => (string) $yearId,
                'semester' => (string) $sem1,
            ]),
            'is_active' => true,
            'created_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports?saved_report_id='.$savedReportId)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('selectedFilters.semester', (string) $sem1)
            );
    }

    public function test_subject_can_be_created_with_credits(): void
    {
        [$adminId] = $this->seedContext();

        $this->actingAs(User::query()->find($adminId))
            ->post('/subjects', [
                'name' => 'Physics',
                'code' => 'PHY101',
                'type' => 'theory',
                'credits' => 4,
                'description' => 'Semester physics',
            ])
            ->assertRedirect('/subjects');

        $this->assertDatabaseHas('subjects', [
            'name' => 'Physics',
            'code' => 'PHY101',
            'credits' => '4.00',
        ]);
    }

    public function test_subject_credits_validation_rejects_negative_values(): void
    {
        [$adminId] = $this->seedContext();

        $this->actingAs(User::query()->find($adminId))
            ->post('/subjects', [
                'name' => 'Bad Credits',
                'code' => 'BAD101',
                'type' => 'theory',
                'credits' => -2,
            ])
            ->assertSessionHasErrors('credits');

        $this->assertDatabaseCount('subjects', 0);
    }

    public function test_subject_credits_can_be_updated(): void
    {
        [$adminId, $orgId] = $this->seedContext();

        $subjectId = DB::table('subjects')->insertGetId([
            'organization_id' => $orgId,
            'name' => 'Chemistry',
            'code' => 'CHEM101',
            'type' => 'both',
            'description' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->find($adminId))
            ->patch('/subjects/'.$subjectId, [
                'name' => 'Chemistry',
                'code' => 'CHEM101',
                'type' => 'both',
                'credits' => 6,
            ])
            ->assertRedirect('/subjects');

        $this->assertDatabaseHas('subjects', [
            'id' => $subjectId,
            'credits' => '6.00',
        ]);
    }

    public function test_report_card_exposes_credit_based_grading(): void
    {
        [$organization, $admin] = $this->seedOrganizationUser('college', 'creditcard');
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-06-01',
            'end_date' => '2027-04-30',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'FY',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'CC-1001',
            'roll_number' => '1',
            'first_name' => 'Credit',
            'last_name' => 'Student',
            'date_of_birth' => '2005-04-01',
            'gender' => 'female',
            'admission_date' => '2026-06-01',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
        ]);

        $exam = Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'exam_type' => 'term_exam',
            'publish_status' => 'published',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-25',
            'status' => 'scheduled',
        ]);

        $physics = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Physics',
            'code' => 'PHY101',
            'type' => 'theory',
            'credits' => 4,
        ]);

        $maths = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH101',
            'type' => 'theory',
            'credits' => 4,
        ]);

        $schedules = [];
        foreach ([['Physics', 90], ['Mathematics', 80]] as [$subjectName, $marks]) {
            $subject = $subjectName === 'Physics' ? $physics : $maths;
            $schedule = ExamSchedule::query()->create([
                'exam_id' => $exam->id,
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'exam_date' => '2026-09-14',
                'start_time' => '08:30:00',
                'end_time' => '10:30:00',
                'max_marks' => 100,
                'passing_marks' => 33,
            ]);

            ExamResult::query()->create([
                'exam_schedule_id' => $schedule->id,
                'student_id' => $student->id,
                'organization_id' => $organization->id,
                'total_marks' => 100,
                'obtained_marks' => $marks,
                'grade' => $marks >= 90 ? 'A+' : 'A',
                'is_absent' => false,
                'entered_by' => $admin->id,
            ]);

            $schedules[] = $schedule;
        }

        $this->assertCount(2, $schedules);

        $this->actingAs($admin)
            ->get('/exams/report-card?student='.$student->id.'&exam='.$exam->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportCard')
                ->where('report.creditBased', true)
                ->where('report.totalCredits', 8)
                ->where('report.sgpa', 3.85)
                ->where('report.cgpa', 3.85)
                ->where('report.subjects.0.subject', 'Physics')
                ->where('report.subjects.0.credits', 4)
                ->where('report.subjects.1.subject', 'Mathematics')
                ->where('report.subjects.1.credits', 4)
            );
    }

    public function test_report_card_cgpa_is_cumulative_across_exams(): void
    {
        [$organization, $admin] = $this->seedOrganizationUser('college', 'cumulative');
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-06-01',
            'end_date' => '2027-04-30',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'FY',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'CUM-1001',
            'roll_number' => '1',
            'first_name' => 'Cumulative',
            'last_name' => 'Student',
            'date_of_birth' => '2005-04-01',
            'gender' => 'female',
            'admission_date' => '2026-06-01',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
        ]);

        $physics = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Physics',
            'code' => 'PHY101',
            'type' => 'theory',
            'credits' => 4,
        ]);

        $maths = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH101',
            'type' => 'theory',
            'credits' => 4,
        ]);

        $semesterOne = Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'exam_type' => 'term_exam',
            'publish_status' => 'published',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-25',
            'status' => 'scheduled',
        ]);

        foreach ([[$physics, 90], [$maths, 80]] as [$subject, $marks]) {
            $schedule = ExamSchedule::query()->create([
                'exam_id' => $semesterOne->id,
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'exam_date' => '2026-09-14',
                'start_time' => '08:30:00',
                'end_time' => '10:30:00',
                'max_marks' => 100,
                'passing_marks' => 33,
            ]);

            ExamResult::query()->create([
                'exam_schedule_id' => $schedule->id,
                'student_id' => $student->id,
                'organization_id' => $organization->id,
                'total_marks' => 100,
                'obtained_marks' => $marks,
                'grade' => 'A',
                'is_absent' => false,
                'entered_by' => $admin->id,
            ]);
        }

        $chemistry = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Chemistry',
            'code' => 'CHEM101',
            'type' => 'theory',
            'credits' => 2,
        ]);

        $semesterTwo = Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'Semester 2',
            'exam_type' => 'term_exam',
            'publish_status' => 'published',
            'start_date' => '2027-02-10',
            'end_date' => '2027-02-25',
            'status' => 'scheduled',
        ]);

        $scheduleTwo = ExamSchedule::query()->create([
            'exam_id' => $semesterTwo->id,
            'class_id' => $class->id,
            'subject_id' => $chemistry->id,
            'exam_date' => '2027-02-14',
            'start_time' => '08:30:00',
            'end_time' => '10:30:00',
            'max_marks' => 100,
            'passing_marks' => 33,
        ]);

        ExamResult::query()->create([
            'exam_schedule_id' => $scheduleTwo->id,
            'student_id' => $student->id,
            'organization_id' => $organization->id,
            'total_marks' => 100,
            'obtained_marks' => 100,
            'grade' => 'A+',
            'is_absent' => false,
            'entered_by' => $admin->id,
        ]);

        $semesterTwoPoint = (float) (GradingScaleService::gradeFor(100, $organization)['point'] ?? 0);
        $expectedCgpa = round(((3.85 * 8) + ($semesterTwoPoint * 2)) / 10, 2);

        $this->assertNotEquals(3.85, $expectedCgpa);

        $this->actingAs($admin)
            ->get('/exams/report-card?student='.$student->id.'&exam='.$semesterOne->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportCard')
                ->where('report.sgpa', 3.85)
                ->where('report.cgpa', $expectedCgpa)
            );
    }

    public function test_report_card_without_credits_is_not_credit_based(): void
    {
        [$organization, $admin] = $this->seedOrganizationUser('school', 'nocredit');
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-06-01',
            'end_date' => '2027-04-30',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'NC-2001',
            'roll_number' => '2',
            'first_name' => 'No',
            'last_name' => 'Credits',
            'date_of_birth' => '2012-04-01',
            'gender' => 'male',
            'admission_date' => '2026-06-01',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
        ]);

        $exam = Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => 'Term 1',
            'exam_type' => 'term_exam',
            'publish_status' => 'published',
            'start_date' => '2026-09-10',
            'end_date' => '2026-09-25',
            'status' => 'scheduled',
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Science',
            'code' => 'SCI101',
            'type' => 'theory',
        ]);

        $schedule = ExamSchedule::query()->create([
            'exam_id' => $exam->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'exam_date' => '2026-09-14',
            'start_time' => '08:30:00',
            'end_time' => '10:30:00',
            'max_marks' => 100,
            'passing_marks' => 33,
        ]);

        ExamResult::query()->create([
            'exam_schedule_id' => $schedule->id,
            'student_id' => $student->id,
            'organization_id' => $organization->id,
            'total_marks' => 100,
            'obtained_marks' => 88,
            'grade' => 'A+',
            'is_absent' => false,
            'entered_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/exams/report-card?student='.$student->id.'&exam='.$exam->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportCard')
                ->where('report.creditBased', false)
                ->where('report.totalCredits', 0)
                ->where('report.sgpa', null)
                ->where('report.cgpa', null)
                ->where('report.subjects.0.credits', null)
            );
    }
}