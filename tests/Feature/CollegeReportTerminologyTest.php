<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CollegeReportTerminologyTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(string $orgType = 'college', string $suffix = 'college'): array
    {
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => ucfirst($suffix).' Institution',
            'slug' => $suffix.'-institution',
            'email' => $suffix.'@terminology.test',
            'phone' => '5555555555',
            'address' => 'Campus Road',
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
            'name' => 'Terminology Admin',
            'email' => 'admin@'.$suffix.'.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organizationId,
            'name' => '2026-2027',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $organizationId,
            'academic_year_id' => $academicYearId,
            'name' => 'BSc Computer Science',
            'section' => 'A',
            'room_number' => 'C1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organizationId,
            'first_name' => 'Neha',
            'last_name' => 'Kulkarni',
            'email' => 'neha@'.$suffix.'.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'CLG-1001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(19)->toDateString(),
            'guardian_name' => 'Ravi Kulkarni',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organizationId,
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$adminId, $organizationId, $academicYearId, $classId, $studentId];
    }

    private function seedExam(int $orgId, int $yearId, ?int $semesterId, string $name): array
    {
        $examId = DB::table('exams')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'semester_id' => $semesterId,
            'name' => $name,
            'exam_type' => 'term',
            'publish_status' => 'published',
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->endOfMonth()->toDateString(),
            'description' => json_encode(['class_name' => 'BSc Computer Science', 'section' => 'A']),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $subjectId = DB::table('subjects')->insertGetId([
            'organization_id' => $orgId,
            'name' => 'Data Structures',
            'code' => 'CS202',
            'type' => 'theory',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$examId, $subjectId];
    }

    public function test_college_reports_use_course_and_term_exam_terminology(): void
    {
        [$adminId, $orgId, $yearId, $classId, $studentId] = $this->seedContext('college', 'college');
        [$examId, $subjectId] = $this->seedExam($orgId, $yearId, null, 'Term I Examination');

        $scheduleId = DB::table('exam_schedules')->insertGetId([
            'exam_id' => $examId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'exam_date' => now()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '11:00',
            'max_marks' => 100,
            'passing_marks' => 35,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('exam_results')->insertGetId([
            'organization_id' => $orgId,
            'exam_schedule_id' => $scheduleId,
            'student_id' => $studentId,
            'obtained_marks' => 85,
            'total_marks' => 100,
            'grade' => 'A',
            'is_absent' => false,
            'entered_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportsAnalytics')
                ->where('moduleReports.0.columns.2', 'Course')
                ->where('moduleReports.1.columns.1', 'Course')
                ->where('moduleReports.2.columns.1', 'Course')
                ->where('moduleReports.3.columns.0', 'Term Exam')
                ->where('studentDistribution.0.class', 'BSc Computer Science')
            );
    }

    public function test_school_reports_keep_class_and_exam_terminology(): void
    {
        [$adminId] = $this->seedContext('school', 'school');

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ReportsAnalytics')
                ->where('moduleReports.0.columns.2', 'Class')
                ->where('moduleReports.3.columns.0', 'Exam')
            );
    }

    public function test_college_student_distribution_groups_by_course_names(): void
    {
        [$adminId, $orgId, $yearId, $classId] = $this->seedContext('university', 'university');

        $secondStudentId = DB::table('students')->insertGetId([
            'organization_id' => $orgId,
            'first_name' => 'Om',
            'last_name' => 'Deshmukh',
            'email' => 'om@university.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'UNI-2002',
            'admission_date' => now()->toDateString(),
            'roll_number' => '2',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(20)->toDateString(),
            'guardian_name' => 'Anil Deshmukh',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $orgId,
            'student_id' => $secondStudentId,
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->find($adminId))
            ->get('/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('studentDistribution.0.class', 'BSc Computer Science')
                ->where('studentDistribution.0.students', 2)
            );
    }

    public function test_exams_page_filters_groups_by_semester_term(): void
    {
        [$adminId, $orgId, $yearId, $classId] = $this->seedContext('college', 'college');

        $semesterOneId = DB::table('semesters')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'name' => 'Semester I',
            'sem_no' => 1,
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->addMonths(5)->toDateString(),
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $semesterTwoId = DB::table('semesters')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'name' => 'Semester II',
            'sem_no' => 2,
            'start_date' => now()->addMonths(6)->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->seedExam($orgId, $yearId, $semesterOneId, 'Term I Examination');
        DB::table('exams')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'semester_id' => $semesterTwoId,
            'name' => 'Term II Examination',
            'exam_type' => 'term',
            'publish_status' => 'published',
            'start_date' => now()->addMonths(6)->toDateString(),
            'end_date' => now()->addMonths(7)->toDateString(),
            'description' => json_encode(['class_name' => 'BSc Computer Science', 'section' => 'A']),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs(User::query()->find($adminId))
            ->get('/exams?semester='.$semesterOneId)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ExamManagement')
                ->has('semesters', 2)
                ->where('selectedSemester', $semesterOneId)
                ->has('examGroups', 1)
                ->where('examGroups.0.name', 'Term I Examination')
            );

        $this->actingAs(User::query()->find($adminId))
            ->get('/exams')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('examGroups', 2)
            );
    }
}