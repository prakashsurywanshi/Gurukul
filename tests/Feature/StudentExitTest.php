<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentExit;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentExitTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_student_exits_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/student-exits')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentExits')
                ->has('pendingExits')
                ->has('register')
                ->has('exited')
                ->has('onHold')
                ->has('activeStudents')
                ->has('reasons')
            );
    }

    public function test_teacher_cannot_view_student_exits_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)
            ->get('/student-exits')
            ->assertForbidden();
    }

    public function test_admin_can_record_permanent_exit(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post('/student-exits', [
                'student_id' => $student->id,
                'type' => 'exit',
                'reason' => 'transfer_out',
                'exit_date' => '2026-08-31',
                'tc_number' => 'TC-2026-001',
                'tc_issued_date' => '2026-09-01',
                'note' => 'Moved to another city.',
            ]);

        $exit = StudentExit::where('student_id', $student->id)->firstOrFail();
        $this->assertSame('exit', $exit->type);
        $this->assertSame('exited', $exit->status);
        $this->assertSame('transfer_out', $exit->reason);

        $this->assertSame('exited', $student->fresh()->enrollment_status);
        $this->assertSame($admin->id, $exit->acted_by);

        $this->assertDatabaseHas('student_exits', [
            'student_id' => $student->id,
            'tc_number' => 'TC-2026-001',
            'note' => 'Moved to another city.',
        ]);
    }

    public function test_exit_reason_is_required_for_permanent_exit(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post('/student-exits', [
                'student_id' => $student->id,
                'type' => 'exit',
                'exit_date' => '2026-08-31',
            ])
            ->assertSessionHasErrors('reason');

        $this->assertDatabaseCount('student_exits', 0);
        $this->assertSame('active', $student->fresh()->enrollment_status);
    }

    public function test_admin_can_place_student_on_temporary_hold(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post('/student-exits', [
                'student_id' => $student->id,
                'type' => 'hold',
                'note' => 'Fee clearance pending.',
            ]);

        $exit = StudentExit::where('student_id', $student->id)->first();
        $this->assertNotNull($exit);
        $this->assertSame('hold', $exit->type);
        $this->assertSame('held', $exit->status);

        $this->assertSame('hold', $student->fresh()->enrollment_status);
    }

    public function test_admin_can_mark_tc_printed(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $this->actingAs($admin)
            ->post('/student-exits/tc-printed', [
                'student_id' => $student->id,
                'tc_number' => 'TC-2026-002',
                'tc_issued_date' => '2026-09-05',
            ]);

        $exit = StudentExit::where('student_id', $student->id)->firstOrFail();
        $this->assertSame('exit', $exit->type);
        $this->assertSame('pending', $exit->status);
        $this->assertSame('TC-2026-002', $exit->tc_number);
        $this->assertSame('active', $student->fresh()->enrollment_status);
    }

    public function test_mark_tc_printed_updates_existing_pending_exit(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        StudentExit::create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'exit',
            'status' => 'pending',
            'acted_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->post('/student-exits/tc-printed', [
                'student_id' => $student->id,
                'tc_number' => 'TC-2026-003',
                'tc_issued_date' => '2026-09-08',
            ]);

        $this->assertDatabaseCount('student_exits', 1);
        $this->assertDatabaseHas('student_exits', [
            'student_id' => $student->id,
            'tc_number' => 'TC-2026-003',
            'status' => 'pending',
        ]);
    }

    public function test_admin_can_restore_exited_student(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $student = $this->createStudent($organization);

        $exit = StudentExit::create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => 'exit',
            'status' => 'exited',
            'reason' => 'withdrawn',
            'exit_date' => '2026-08-31',
            'acted_by' => $admin->id,
        ]);

        $student->update(['enrollment_status' => 'exited']);

        $this->actingAs($admin)
            ->post("/student-exits/{$student->id}/restore");

        $this->assertSame('active', $student->fresh()->enrollment_status);
        $this->assertSame('restored', $exit->fresh()->status);
    }

    public function test_cannot_read_other_organization_student_exits(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherStudent = $this->createStudent($otherOrganization, 'ADM-2001');

        $this->actingAs($admin)
            ->get('/student-exits')
            ->assertInertia(fn ($page) => $page
                ->where('activeStudents', fn ($students) => collect($students)->pluck('id')->doesntContain($otherStudent->id))
            );
    }

    public function test_cannot_restore_student_from_another_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $otherStudent = $this->createStudent($otherOrganization, 'ADM-2001');

        StudentExit::create([
            'organization_id' => $otherOrganization->id,
            'student_id' => $otherStudent->id,
            'type' => 'exit',
            'status' => 'exited',
            'acted_by' => $admin->id,
        ]);

        $otherStudent->update(['enrollment_status' => 'exited']);

        $this->actingAs($admin)
            ->post("/student-exits/{$otherStudent->id}/restore")
            ->assertNotFound();

        $this->assertSame('exited', $otherStudent->fresh()->enrollment_status);
    }

    private function createStudent(Organization $organization, string $admissionNo = 'ADM-1001'): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => $admissionNo,
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);
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
}