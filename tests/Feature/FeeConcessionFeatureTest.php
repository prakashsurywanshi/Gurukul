<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeeConcessionRequest;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeConcessionFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_concession_requests(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        [$student, $year] = $this->seedStudent($organization);

        FeeConcessionRequest::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'amount' => 500,
            'reason' => 'Sibling concession',
            'requested_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/fees/concession-requests')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FeeConcessions')
                ->has('requests', 1)
                ->where('requests.0.amount', 500)
                ->where('requests.0.status', 'pending')
                ->where('canReview', true)
            );
    }

    public function test_accountant_can_request_and_admin_is_notified(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $accountant = $this->createUser($organization, 'accountant');

        [$student, $year] = $this->seedStudent($organization);

        $this->actingAs($accountant)
            ->post('/fees/concession-requests', [
                'student_id' => $student->id,
                'amount' => 750.5,
                'reason' => 'Economically weaker section.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('fee_concession_requests', [
            'student_id' => $student->id,
            'amount' => 750.5,
            'status' => 'pending',
            'requested_by' => $accountant->id,
        ]);

        $notifications = SystemNotification::query()->where('user_id', $admin->id)->where('type', 'fee_concession')->get();
        $this->assertSame(1, $notifications->count());
    }

    public function test_approving_applies_discount_to_balance(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $accountant = $this->createUser($organization, 'accountant');

        [$student, $year] = $this->seedStudent($organization);

        $structure = \App\Models\FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'class_id' => $student->class_id,
            'fee_type' => 'tuition',
            'amount' => 2000,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        StudentFee::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $structure->id,
            'academic_year_id' => $year->id,
            'month' => 'January',
            'year' => now()->year,
            'amount' => 2000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 2000,
            'paid_amount' => 0,
            'balance' => 2000,
            'due_date' => now()->startOfMonth()->toDateString(),
            'status' => 'pending',
        ]);

        $concession = FeeConcessionRequest::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'amount' => 500,
            'reason' => 'Hardship.',
            'requested_by' => $accountant->id,
        ]);

        $this->actingAs($admin)
            ->patch("/fees/concession-requests/{$concession->id}/review", ['action' => 'approve'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $fresh = $concession->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertSame('500.00', $fresh->applied_amount);

        $fee = StudentFee::query()->where('student_id', $student->id)->first();
        $this->assertSame('500.00', $fee->discount);
        $this->assertSame('1500.00', $fee->net_amount);
        $this->assertSame('1500.00', $fee->balance);

        $this->assertDatabaseHas('activity_logs', [
            'module' => 'Fee Concession',
            'action' => 'Approved',
        ]);
    }

    public function test_review_rejects_for_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $accountant = $this->createUser($organization, 'accountant');

        [$student, $year] = $this->seedStudent($organization);

        $concession = FeeConcessionRequest::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'amount' => 300,
            'reason' => 'Test.',
            'requested_by' => $accountant->id,
        ]);

        $this->actingAs($accountant)
            ->patch("/fees/concession-requests/{$concession->id}/review", ['action' => 'approve'])
            ->assertForbidden();
    }

    private function seedStudent(Organization $organization): array
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '6',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'FC-'.$organization->id,
            'first_name' => 'Ishita',
            'last_name' => 'Gupta',
            'date_of_birth' => '2013-05-10',
            'gender' => 'female',
            'admission_date' => now()->toDateString(),
            'status' => 'active',
        ]);

        return [$student, $year];
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school-'.uniqid(),
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
}