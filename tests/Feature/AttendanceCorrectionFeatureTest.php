<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceCorrectionFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_corrections_list(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        [$student, $date] = $this->createPending($organization, $admin);

        $this->actingAs($admin)
            ->get('/attendance-corrections')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AttendanceCorrections')
                ->has('corrections', 1)
                ->where('corrections.0.student_id', (string) $student->id)
                ->where('corrections.0.current_status', 'absent')
                ->where('corrections.0.requested_status', 'present')
                ->where('corrections.0.status', 'pending')
                ->where('canReview', true)
            );
    }

    public function test_teacher_can_request_correction_and_is_restricted_to_own_class(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        [$student, $date] = $this->seedStudent($organization, $teacher);

        $this->actingAs($teacher)
            ->post('/attendance-corrections', [
                'student_id' => $student->id,
                'date' => $date,
                'requested_status' => 'present',
                'reason' => 'Was on a school tournament.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('attendance_corrections', [
            'student_id' => $student->id,
            'requested_status' => 'present',
            'status' => 'pending',
            'requested_by' => $teacher->id,
        ]);

        $notifications = SystemNotification::query()->where('organization_id', $organization->id)->get();
        $this->assertSame(1, $notifications->count());
        $this->assertSame('attendance_correction', $notifications->first()->type);

        $otherTeacher = $this->createUser($organization, 'teacher');
        $this->actingAs($otherTeacher)->get('/attendance-corrections')->assertOk();
    }

    public function test_approving_correction_updates_attendance_and_notifies_requester(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        [$student, $date] = $this->seedStudent($organization, $teacher);

        $correction = AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $student->class_id,
            'date' => $date,
            'current_status' => 'absent',
            'requested_status' => 'present',
            'reason' => 'Medical certificate attached.',
            'status' => 'pending',
            'requested_by' => $teacher->id,
        ]);

        $this->actingAs($admin)
            ->patch("/attendance-corrections/{$correction->id}/review", ['action' => 'approve', 'review_note' => 'Verified certificate.'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertNotNull(
            Attendance::query()
                ->where('student_id', $student->id)
                ->where('status', 'present')
                ->whereDate('date', $date)
                ->first()
        );

        $fresh = $correction->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertSame($admin->id, $fresh->reviewed_by);
        $this->assertNotNull($fresh->reviewed_at);

        $this->assertDatabaseHas('activity_logs', [
            'module' => 'Attendance Correction',
            'action' => 'Approved',
        ]);

        $requesterNotifications = SystemNotification::query()->where('user_id', $teacher->id)->get();
        $this->assertSame(1, $requesterNotifications->count());
    }

    public function test_review_rejects_for_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        [$student, $date] = $this->seedStudent($organization, $teacher);

        $correction = AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'date' => $date,
            'current_status' => 'absent',
            'requested_status' => 'present',
            'status' => 'pending',
            'requested_by' => $teacher->id,
        ]);

        $this->actingAs($teacher)
            ->patch("/attendance-corrections/{$correction->id}/review", ['action' => 'approve'])
            ->assertForbidden();
    }

    public function test_only_own_class_corrections_visible_to_teacher(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $classA = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '6',
            'section' => 'A',
            'status' => 'active',
            'class_teacher_id' => $teacher->id,
        ]);

        $classB = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '7',
            'section' => 'A',
            'status' => 'active',
            'class_teacher_id' => $admin->id,
        ]);

        $studentA = $this->seedStudentInClass($organization, $classA, 'AC-CLASS-A');
        $studentB = $this->seedStudentInClass($organization, $classB, 'AC-CLASS-B');

        AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentA->id,
            'class_id' => $classA->id,
            'date' => now()->toDateString(),
            'current_status' => 'absent',
            'requested_status' => 'present',
            'status' => 'pending',
            'requested_by' => $teacher->id,
        ]);

        AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $studentB->id,
            'class_id' => $classB->id,
            'date' => now()->toDateString(),
            'current_status' => 'absent',
            'requested_status' => 'present',
            'status' => 'pending',
            'requested_by' => $admin->id,
        ]);

        $this->actingAs($teacher)
            ->get('/attendance-corrections')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('corrections', 1)
                ->where('corrections.0.student_id', (string) $studentA->id)
            );
    }

    private function createPending(Organization $organization, User $admin): array
    {
        [$student, $date] = $this->seedStudent($organization, $admin);

        AttendanceCorrection::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $student->class_id,
            'date' => $date,
            'current_status' => 'absent',
            'requested_status' => 'present',
            'reason' => 'Student was at a district event.',
            'status' => 'pending',
            'requested_by' => $admin->id,
        ]);

        return [$student, $date];
    }

    private function seedStudent(Organization $organization, User $teacher): array
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
            'class_teacher_id' => $teacher->id,
        ]);

        $student = $this->seedStudentInClass($organization, $class, 'AC-'.$organization->id);

        return [$student, now()->toDateString()];
    }

    private function seedStudentInClass(Organization $organization, SchoolClass $class, string $admissionNo): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'date_of_birth' => '2013-05-10',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
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