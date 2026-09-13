<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportCardRemarksFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Remarks School',
            'slug' => 'remarks-school',
            'email' => 'school@remarks.test',
            'phone' => '6666666666',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Admin User',
            'email' => 'admin@remarks.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => $academicYearId,
            'name' => '10',
            'section' => 'A',
            'room_number' => 'R1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organization,
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'priya@remarks.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'ADM-1001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
            'guardian_email' => 'rahul@guardian.test',
            'guardian_phone' => '7777777777',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organization,
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $admin = \App\Models\User::query()->find($adminId);

        return [$admin, $organization, $classId, $studentId];
    }

    public function test_marksheet_remarks_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/marksheet-remarks')->assertOk();
    }

    public function test_grid_loads_students_for_selected_class(): void
    {
        [$admin, $organization, $classId] = $this->seedContext();

        $this->actingAs($admin)
            ->get("/marksheet-remarks?class={$classId}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/EnterReportCardRemarks')
                ->has('classes', 1)
                ->has('students', 1)
                ->where('students.0.name', 'Priya Sharma'));
    }

    public function test_session_level_remarks_saved(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/marksheet-remarks', [
                'class_id' => $classId,
                'students' => [
                    [
                        'student_id' => $studentId,
                        'class_teacher_remark' => 'Consistent performer',
                        'principal_remark' => 'Keep it up',
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('report_card_remarks', [
            'organization_id' => $organization,
            'exam_id' => null,
            'student_id' => $studentId,
            'class_teacher_remark' => 'Consistent performer',
            'principal_remark' => 'Keep it up',
        ]);
    }

    public function test_term_level_remarks_saved_under_exam(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $examId = DB::table('exams')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => DB::table('academic_years')->where('organization_id', $organization)->value('id'),
            'name' => 'Term 1',
            'exam_type' => 'term_exam',
            'publish_status' => 'draft',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
            'status' => 'scheduled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post('/marksheet-remarks', [
                'class_id' => $classId,
                'exam_id' => $examId,
                'students' => [
                    [
                        'student_id' => $studentId,
                        'class_teacher_remark' => 'Good in Term 1',
                        'principal_remark' => '',
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('report_card_remarks', [
            'organization_id' => $organization,
            'exam_id' => $examId,
            'student_id' => $studentId,
            'class_teacher_remark' => 'Good in Term 1',
            'principal_remark' => null,
        ]);
    }

    public function test_blank_remarks_delete_existing_row(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        DB::table('report_card_remarks')->insert([
            'organization_id' => $organization,
            'exam_id' => null,
            'student_id' => $studentId,
            'class_teacher_remark' => 'Old remark',
            'principal_remark' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post('/marksheet-remarks', [
                'class_id' => $classId,
                'students' => [
                    [
                        'student_id' => $studentId,
                        'class_teacher_remark' => '   ',
                        'principal_remark' => '',
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('report_card_remarks', [
            'organization_id' => $organization,
            'exam_id' => null,
            'student_id' => $studentId,
        ]);
    }

    public function test_subject_options_are_scoped_to_selected_class(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $otherClassId = DB::table('classes')->insertGetId([
            'organization_id' => $organization,
            'academic_year_id' => DB::table('academic_years')->where('organization_id', $organization)->value('id'),
            'name' => '11',
            'section' => 'B',
            'room_number' => 'R2',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $mathId = $this->createSubject($organization, 'Mathematics');
        $this->attachSubjectToClass($organization, $classId, $mathId);
        $this->attachSubjectToClass($organization, $otherClassId, $mathId);

        $scienceId = $this->createSubject($organization, 'Science');
        $this->attachSubjectToClass($organization, $otherClassId, $scienceId);

        $this->actingAs($admin)
            ->get("/marksheet-remarks?class={$classId}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('subjects', 1)
                ->where('subjects.0.name', 'Mathematics'));
    }

    public function test_subject_wise_remark_saved(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $subjectId = $this->createSubject($organization, 'Mathematics');
        $this->attachSubjectToClass($organization, $classId, $subjectId);

        $this->actingAs($admin)
            ->post('/marksheet-remarks', [
                'class_id' => $classId,
                'subject_id' => $subjectId,
                'students' => [
                    [
                        'student_id' => $studentId,
                        'class_teacher_remark' => 'Needs practice',
                        'principal_remark' => '',
                        'subject_remark' => 'Strong at algebra, revise geometry.',
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('report_card_remarks', [
            'organization_id' => $organization,
            'exam_id' => null,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
            'subject_remark' => 'Strong at algebra, revise geometry.',
        ]);
    }

    public function test_remarks_are_distinct_per_subject_for_same_student(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $mathId = $this->createSubject($organization, 'Mathematics');
        $scienceId = $this->createSubject($organization, 'Science');
        $this->attachSubjectToClass($organization, $classId, $mathId);
        $this->attachSubjectToClass($organization, $classId, $scienceId);

        $payload = fn (int $subjectId, string $remark) => [
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'students' => [
                [
                    'student_id' => $studentId,
                    'class_teacher_remark' => '',
                    'principal_remark' => '',
                    'subject_remark' => $remark,
                ],
            ],
        ];

        $this->actingAs($admin)->post('/marksheet-remarks', $payload($mathId, 'Math remark'))->assertRedirect();
        $this->actingAs($admin)->post('/marksheet-remarks', $payload($scienceId, 'Science remark'))->assertRedirect();

        $this->assertDatabaseHas('report_card_remarks', [
            'organization_id' => $organization,
            'student_id' => $studentId,
            'subject_id' => $mathId,
            'subject_remark' => 'Math remark',
        ]);
        $this->assertDatabaseHas('report_card_remarks', [
            'organization_id' => $organization,
            'student_id' => $studentId,
            'subject_id' => $scienceId,
            'subject_remark' => 'Science remark',
        ]);
        $this->assertSame(2, DB::table('report_card_remarks')->where('organization_id', $organization)->where('student_id', $studentId)->count());
    }

    public function test_subject_remark_surfaced_in_grid(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $subjectId = $this->createSubject($organization, 'Mathematics');
        $this->attachSubjectToClass($organization, $classId, $subjectId);

        DB::table('report_card_remarks')->insert([
            'organization_id' => $organization,
            'exam_id' => null,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
            'class_teacher_remark' => null,
            'principal_remark' => null,
            'subject_remark' => 'Needs more geometry practice.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get("/marksheet-remarks?class={$classId}&subject={$subjectId}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('students', 1)
                ->where('students.0.subjectRemark', 'Needs more geometry practice.'));
    }

    public function test_blank_subject_remark_deletes_subject_row(): void
    {
        [$admin, $organization, $classId, $studentId] = $this->seedContext();

        $subjectId = $this->createSubject($organization, 'Mathematics');
        $this->attachSubjectToClass($organization, $classId, $subjectId);

        DB::table('report_card_remarks')->insert([
            'organization_id' => $organization,
            'exam_id' => null,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
            'subject_remark' => 'Old subject remark',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post('/marksheet-remarks', [
                'class_id' => $classId,
                'subject_id' => $subjectId,
                'students' => [
                    [
                        'student_id' => $studentId,
                        'class_teacher_remark' => '',
                        'principal_remark' => '',
                        'subject_remark' => '   ',
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('report_card_remarks', [
            'organization_id' => $organization,
            'student_id' => $studentId,
            'subject_id' => $subjectId,
        ]);
    }

    private function createSubject(int $organization, string $name): int
    {
        return DB::table('subjects')->insertGetId([
            'organization_id' => $organization,
            'name' => $name,
            'code' => strtoupper(substr($name, 0, 2)) . uniqid(),
            'type' => 'theory',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function attachSubjectToClass(int $organization, int $classId, int $subjectId): void
    {
        DB::table('class_subject')->insert([
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}