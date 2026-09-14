<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeStructure;
use App\Models\HealthRecord;
use App\Models\Incident;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GlobalSearchFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_is_redirected_to_login(): void
    {
        $this->get('/global-search?q=riya')->assertRedirect('/login');
    }

    public function test_global_search_returns_students_and_staff_for_admin(): void
    {
        $org = $this->seedOrganization();

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Principal Verma',
            'email' => 'principal@school.test',
        ]);

        User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Amit Deshmukh',
            'email' => 'amit@school.test',
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-1001',
            'first_name' => 'Riya',
            'last_name' => 'Sharma',
            'date_of_birth' => '2013-02-10',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->getJson('/global-search?q=riya')
            ->assertOk()
            ->assertJsonPath('students.0.type', 'student')
            ->assertJsonPath('students.0.name', 'Riya Sharma')
            ->assertJsonPath('students.0.subtitle', 'ADM-1001')
            ->assertJsonPath('students.0.href', '/students/' . $student->id);

        $this->actingAs($admin)
            ->getJson('/global-search?q=amit')
            ->assertOk()
            ->assertJsonPath('staff.0.type', 'staff')
            ->assertJsonPath('staff.0.name', 'Amit Deshmukh')
            ->assertJsonPath('staff.0.href', '/staff/' . User::query()->where('email', 'amit@school.test')->first()->id);
    }

    public function test_admin_sees_all_six_entity_types(): void
    {
        $org = $this->seedOrganization();
        $year = AcademicYear::query()->create([
            'organization_id' => $org->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Search',
            'email' => 'admin-search@school.test',
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-4001',
            'first_name' => 'Kiran',
            'last_name' => 'Naik',
            'date_of_birth' => '2012-05-10',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Kiran Bhat',
            'email' => 'kiran-bhat@school.test',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year->id,
            'name' => 'Kiran House',
            'section' => 'A',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'fee_type' => 'tuition',
            'amount' => 5000,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        StudentFee::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'fee_structure_id' => $feeStructure->id,
            'academic_year_id' => $year->id,
            'month' => 'April',
            'year' => 2026,
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 0,
            'balance' => 5000,
            'due_date' => '2026-04-10',
            'status' => 'pending',
        ]);

        Incident::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'type' => 'behavior',
            'title' => 'Kiran behavioral issue',
            'incident_date' => '2026-05-01',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        HealthRecord::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'record_date' => '2026-06-01',
            'blood_group' => 'B+',
            'recorded_by' => $admin->id,
        ]);

        $this->actingAs($admin)->getJson('/global-search?q=kiran')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonCount(1, 'staff')
            ->assertJsonCount(1, 'classes')
            ->assertJsonCount(1, 'fees')
            ->assertJsonCount(1, 'behavior')
            ->assertJsonCount(1, 'health')
            ->assertJsonPath('students.0.href', '/students/' . $student->id)
            ->assertJsonPath('staff.0.href', '/staff/' . User::query()->where('email', 'kiran-bhat@school.test')->first()->id)
            ->assertJsonPath('classes.0.href', '/classes/' . $class->id)
            ->assertJsonPath('classes.0.name', 'Kiran House - A')
            ->assertJsonPath('fees.0.href', '/students/' . $student->id . '?tab=fees')
            ->assertJsonPath('behavior.0.href', '/student-behavior?student_id=' . $student->id)
            ->assertJsonPath('health.0.href', '/student-health?student_id=' . $student->id);
    }

    public function test_teacher_sees_students_but_not_staff_or_gated_types(): void
    {
        $org = $this->seedOrganization();
        $year = AcademicYear::query()->create([
            'organization_id' => $org->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $teacher = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Teacher Khatri',
            'email' => 'khatri@school.test',
        ]);

        User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'accountant',
            'name' => 'Nilesh Accountant',
            'email' => 'nilesh@school.test',
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-2001',
            'first_name' => 'Tejas',
            'last_name' => 'Patil',
            'date_of_birth' => '2012-06-01',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'B',
            'status' => 'active',
        ]);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'fee_type' => 'tuition',
            'amount' => 3000,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        StudentFee::query()->create([
            'organization_id' => $org->id,
            'student_id' => $student->id,
            'fee_structure_id' => $feeStructure->id,
            'academic_year_id' => $year->id,
            'month' => 'April',
            'year' => 2026,
            'amount' => 3000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 3000,
            'paid_amount' => 0,
            'balance' => 3000,
            'due_date' => '2026-04-10',
            'status' => 'pending',
        ]);

        $this->actingAs($teacher)
            ->getJson('/global-search?q=tejas')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonCount(0, 'staff')
            ->assertJsonCount(0, 'classes')
            ->assertJsonCount(0, 'fees')
            ->assertJsonCount(0, 'behavior')
            ->assertJsonCount(0, 'health');
    }

    public function test_student_search_is_scoped_to_the_current_organization(): void
    {
        $org = $this->seedOrganization();
        $otherOrg = Organization::create($this->orgFields('Other Academy', 'other-academy'));

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin One',
            'email' => 'admin@school.test',
        ]);

        $year = AcademicYear::query()->create([
            'organization_id' => $org->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $otherYear = AcademicYear::query()->create([
            'organization_id' => $otherOrg->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $year->id,
            'name' => 'Sneha Class',
            'section' => 'A',
            'status' => 'active',
        ]);

        SchoolClass::query()->create([
            'organization_id' => $otherOrg->id,
            'academic_year_id' => $otherYear->id,
            'name' => 'Sneha Class',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-3001',
            'first_name' => 'Sneha',
            'last_name' => 'Joshi',
            'date_of_birth' => '2011-01-01',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        Student::query()->create([
            'organization_id' => $otherOrg->id,
            'admission_no' => 'ADM-X001',
            'first_name' => 'Sneha',
            'last_name' => 'Joshi',
            'date_of_birth' => '2011-01-01',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->getJson('/global-search?q=sneha')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.href', '/students/' . $student->id)
            ->assertJsonCount(1, 'classes');
    }

    public function test_blank_query_returns_empty_results(): void
    {
        $org = $this->seedOrganization();

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Two',
            'email' => 'admin2@school.test',
        ]);

        $this->actingAs($admin)
            ->getJson('/global-search?q=')
            ->assertOk()
            ->assertJsonCount(0, 'students')
            ->assertJsonCount(0, 'staff')
            ->assertJsonCount(0, 'classes')
            ->assertJsonCount(0, 'fees')
            ->assertJsonCount(0, 'behavior')
            ->assertJsonCount(0, 'health');
    }

    public function test_dashboard_shares_header_notification_props(): void
    {
        $org = $this->seedOrganization();

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Three',
            'email' => 'admin3@school.test',
            'password' => Hash::make('secret'),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('headerNotifications')
                ->where('headerNotifications.unreadCount', 0)
                ->where('chatUnread', 0));
    }

    private function seedOrganization(): Organization
    {
        return Organization::create($this->orgFields('Search School', 'search-school'));
    }

    private function orgFields(string $name, string $slug): array
    {
        return [
            'name' => $name,
            'slug' => $slug,
            'email' => $slug . '@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ];
    }
}
