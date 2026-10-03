<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\FeePayment;
use App\Models\LibraryBook;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tenancy coverage for the reports API.
 *
 * Every aggregation in `ReportsApiController` was previously global, so a report
 * opened in one school counted students, fees and staff across every other
 * organization on the instance. These tests pin the organization scoping to the
 * authenticated user.
 */
class ReportsApiTenancyTest extends TestCase
{
    use RefreshDatabase;

    private Organization $alpha;

    private Organization $beta;

    private User $alphaAdmin;

    private User $betaAdmin;

    private ?AcademicYear $academicYear = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->alpha = $this->createOrganization('Alpha School', 'alpha-reports');
        $this->beta = $this->createOrganization('Beta School', 'beta-reports');

        $this->alphaAdmin = $this->createUser($this->alpha, 'alpha.admin@example.test');
        $this->betaAdmin = $this->createUser($this->beta, 'beta.admin@example.test');

        // Both tenants get a class and a student, and the two students get the
        // same class name on purpose: a report that leaks by class id rather
        // than by organization would be caught by the class-options test.
        $this->createStudent($this->alpha, 'ADM-A', 'Alpha Student');
        $this->createStudent($this->beta, 'ADM-B', 'Beta Student');
    }

    public function test_overview_counts_only_the_callers_organization(): void
    {
        Sanctum::actingAs($this->alphaAdmin);

        $response = $this->getJson('/api/reports/overview')->assertOk();

        $this->assertSame(1, $response->json('data.summary.total_students'));
        $this->assertSame(1, $response->json('data.summary.total_classes'));
    }

    public function test_overview_is_scoped_per_tenant(): void
    {
        Sanctum::actingAs($this->betaAdmin);

        $response = $this->getJson('/api/reports/overview')->assertOk();

        $this->assertSame(1, $response->json('data.summary.total_students'));
    }

    public function test_staff_report_does_not_leak_other_tenants_users(): void
    {
        Sanctum::actingAs($this->alphaAdmin);

        $emails = collect($this->getJson('/api/reports/staff')->assertOk()->json('data.staff'))
            ->pluck('email')
            ->all();

        $this->assertContains($this->alphaAdmin->email, $emails);
        $this->assertNotContains($this->betaAdmin->email, $emails, 'Staff from another organization must not be listed.');
    }

    public function test_analytics_metrics_are_scoped_to_the_callers_organization(): void
    {
        $this->createAttendance($this->alpha, 'present');
        $this->createAttendance($this->beta, 'absent');

        Sanctum::actingAs($this->alphaAdmin);

        $response = $this->getJson('/api/reports/analytics')->assertOk();

        // Only the Alpha student's record is present, so the rate is 100%.
        $this->assertSame(1, $response->json('data.metrics.totalStudents'));
        $this->assertEqualsWithDelta(100.0, (float) $response->json('data.metrics.attendanceRate'), 0.01);
    }

    public function test_analytics_class_options_are_scoped(): void
    {
        $alphaClassId = SchoolClass::query()->where('organization_id', $this->alpha->id)->value('id');
        $betaClassId = SchoolClass::query()->where('organization_id', $this->beta->id)->value('id');

        Sanctum::actingAs($this->alphaAdmin);

        $values = collect($this->getJson('/api/reports/analytics')->assertOk()->json('data.classOptions'))
            ->pluck('value')
            ->all();

        $this->assertContains((string) $alphaClassId, $values);
        $this->assertNotContains((string) $betaClassId, $values);
    }

    public function test_attendance_report_excludes_other_tenants_records(): void
    {
        $this->createAttendance($this->alpha, 'present');
        $this->createAttendance($this->beta, 'absent');

        Sanctum::actingAs($this->alphaAdmin);

        $response = $this->getJson('/api/reports/attendance')->assertOk();

        $this->assertSame(1, $response->json('data.statistics.total_records'));
        $this->assertSame(1, $response->json('data.statistics.present'));
        $this->assertSame(0, $response->json('data.statistics.absent'));
    }

    public function test_fee_report_excludes_other_tenants_rows(): void
    {
        $this->createStudentFee($this->alpha, 5000, 1000);
        $this->createStudentFee($this->beta, 9000, 0);

        Sanctum::actingAs($this->alphaAdmin);

        $summary = $this->getJson('/api/reports/fee')->assertOk()->json('data.summary');

        $this->assertSame(1, $summary['total_records']);
        $this->assertSame(5000.0, (float) $summary['total_amount']);
    }

    public function test_progress_rejects_a_cross_tenant_student(): void
    {
        $foreignStudent = Student::query()->where('organization_id', $this->beta->id)->first();

        Sanctum::actingAs($this->alphaAdmin);

        // The organization-scoped exists() rule must reject this, rather than
        // returning a 200 with someone else's fee and attendance data.
        $this->getJson('/api/reports/progress?student_id='.$foreignStudent->id)
            ->assertStatus(422);
    }

    public function test_progress_serves_the_callers_own_student(): void
    {
        $ownStudent = Student::query()->where('organization_id', $this->alpha->id)->first();

        Sanctum::actingAs($this->alphaAdmin);

        $this->getJson('/api/reports/progress?student_id='.$ownStudent->id)
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_library_totals_are_scoped(): void
    {
        LibraryBook::query()->create([
            'organization_id' => $this->alpha->id,
            'book_number' => 'BK-ALPHA',
            'title' => 'Alpha Book',
            'author' => 'A',
            'category' => 'general',
            'isbn' => 'ALPHA-1',
            'total_copies' => 10,
            'available_copies' => 7,
            'status' => 'active',
        ]);

        LibraryBook::query()->create([
            'organization_id' => $this->beta->id,
            'book_number' => 'BK-BETA',
            'title' => 'Beta Book',
            'author' => 'B',
            'category' => 'general',
            'isbn' => 'BETA-1',
            'total_copies' => 99,
            'available_copies' => 99,
            'status' => 'active',
        ]);

        Sanctum::actingAs($this->alphaAdmin);

        $stats = $this->getJson('/api/reports/library')->assertOk()->json('data.statistics');

        // Titles, not copies: Alpha has 1 title (10 copies), Beta has 1 (99).
        $this->assertSame(1, $stats['total_books_in_library']);
        $this->assertEqualsWithDelta(7, (float) $stats['available_copies'], 0.01);
    }

    public function test_reports_require_an_organization_link(): void
    {
        $orphan = User::query()->create([
            'organization_id' => null,
            'name' => 'Orphan Admin',
            'email' => 'orphan.admin@example.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        Sanctum::actingAs($orphan);

        $this->getJson('/api/reports/overview')->assertForbidden();
        $this->getJson('/api/reports/attendance')->assertForbidden();
    }

    public function test_fee_collection_series_uses_the_success_status_that_writers_persist(): void
    {
        // Every writer persists `status = success`. Filtering on `completed`
        // returned nothing, so the collected series was permanently empty.
        $this->createPayment($this->alpha, 2500);
        $this->createStudentFee($this->alpha, 4000, 0);

        Sanctum::actingAs($this->alphaAdmin);

        $response = $this->getJson('/api/reports/analytics')->assertOk();

        $collected = collect($response->json('data.feeCollectionData'))->sum('collected');

        $this->assertSame(2500.0, (float) $collected, 'A successful payment must appear in the collected series.');
    }

    public function test_v1_mirror_is_equally_scoped(): void
    {
        $this->createAttendance($this->alpha, 'present');
        $this->createAttendance($this->beta, 'absent');

        Sanctum::actingAs($this->alphaAdmin);

        $response = $this->getJson('/api/v1/reports/attendance')->assertOk();

        $this->assertSame(1, $response->json('data.statistics.total_records'));
    }

    // ---- fixtures ---------------------------------------------------------

    private function createOrganization(string $name, string $slug): Organization
    {
        return Organization::query()->create([
            'name' => $name,
            'slug' => $slug,
            'email' => $slug.'@example.test',
            'phone' => '9000000'.abs(crc32($slug)) % 100,
            'address' => 'Main Road',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'settings' => [],
        ]);
    }

    private function createUser(Organization $organization, string $email): User
    {
        return User::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Admin',
            'email' => $email,
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    private function createStudent(Organization $organization, string $admissionNo, string $firstName): Student
    {
        $this->academicYear ??= AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $this->academicYear->id,
            'name' => '5',
            'section' => 'A',
            'status' => 'active',
        ]);

        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => $admissionNo,
            'first_name' => $firstName,
            'last_name' => 'Student',
            'class_id' => $class->id,
            'status' => 'active',
            'date_of_birth' => '2015-06-15',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);
    }

    private function createAttendance(Organization $organization, string $status): void
    {
        $student = Student::query()->where('organization_id', $organization->id)->firstOrFail();

        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $student->class_id,
            'date' => now()->toDateString(),
            'status' => $status,
            'marked_by' => $this->alphaAdmin->id,
        ]);
    }

    private function createStudentFee(Organization $organization, float $netAmount, float $paid): void
    {
        $student = Student::query()->where('organization_id', $organization->id)->firstOrFail();

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            // fee_structure_id / academic_year_id are NOT NULL on MySQL; a null
            // structure keeps the row from pulling in any real structure data.
            'fee_structure_id' => 0,
            'academic_year_id' => $this->academicYear->id,
            'amount' => $netAmount,
            'discount' => 0,
            'net_amount' => $netAmount,
            'paid_amount' => $paid,
            'balance' => $netAmount - $paid,
            'status' => $paid > 0 ? 'partial' : 'pending',
            'year' => (int) now()->year,
            'month' => (int) now()->month,
            'due_date' => now()->addMonth()->toDateString(),
        ]);
    }

    private function createPayment(Organization $organization, float $amount): void
    {
        $student = Student::query()->where('organization_id', $organization->id)->firstOrFail();

        $fee = StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => 0,
            'academic_year_id' => $this->academicYear->id,
            'amount' => $amount,
            'discount' => 0,
            'net_amount' => $amount,
            'paid_amount' => $amount,
            'balance' => 0,
            'status' => 'paid',
            'year' => (int) now()->year,
            'month' => (int) now()->month,
            'due_date' => now()->toDateString(),
        ]);

        FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $fee->id,
            'student_id' => $student->id,
            'amount' => $amount,
            'payment_method' => 'cash',
            // Must match what FeesApiController/FeesController write.
            'status' => 'success',
            'payment_date' => now()->toDateString(),
            'collected_by' => $this->alphaAdmin->id,
            'receipt_number' => 'RCP-'.strtoupper(substr(md5($student->id.'-'.uniqid()), 0, 6)),
        ]);
    }
}