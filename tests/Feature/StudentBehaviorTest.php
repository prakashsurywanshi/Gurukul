<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Incident;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentBehaviorTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_behavior_records(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        [$student] = $this->seedStudent($organization);
        $record = $this->createRecord($organization, $admin, $student, 'behavior');

        $this->actingAs($admin)
            ->get('/student-behavior')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StudentBehavior')
                ->has('records', 1)
                ->where('records.0.title', 'Helped a classmate')
                ->where('records.0.student.name', 'Aarav Mehta')
                ->has('classGroups', 1)
            );
    }

    public function test_admin_can_add_a_behavior_record(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        [$student] = $this->seedStudent($organization);

        $this->actingAs($admin)
            ->post('/student-behavior', [
                'student_id' => $student->id,
                'title' => 'Positive participation in class',
                'description' => 'Volunteered to help with group activity.',
                'incident_date' => '2026-09-10',
                'status' => 'open',
                'action_taken' => null,
            ])
            ->assertRedirect();

        $record = Incident::query()->first();
        $this->assertNotNull($record);
        $this->assertSame('behavior', $record->type);
        $this->assertSame('Positive participation in class', $record->title);
    }

    public function test_admin_can_update_and_delete_a_behavior_record(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        [$student] = $this->seedStudent($organization);
        $record = $this->createRecord($organization, $admin, $student, 'behavior');

        $this->actingAs($admin)
            ->patch("/student-behavior/{$record->id}", [
                'title' => 'Updated behavior title',
                'description' => null,
                'incident_date' => '2026-09-11',
                'status' => 'resolved',
                'action_taken' => 'Counselled by class teacher.',
            ])
            ->assertRedirect();

        $this->assertSame('resolved', $record->fresh()->status);
        $this->assertSame('Counselled by class teacher.', $record->fresh()->action_taken);

        $this->actingAs($admin)
            ->delete("/student-behavior/{$record->id}")
            ->assertRedirect();

        $this->assertNull(Incident::query()->find($record->id));
    }

    public function test_behavior_records_do_not_include_other_incident_types(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        [$student] = $this->seedStudent($organization);
        $this->createRecord($organization, $admin, $student, 'behavior');
        $this->createRecord($organization, $admin, $student, 'academic');

        $this->actingAs($admin)
            ->get('/student-behavior')
            ->assertInertia(fn ($page) => $page->has('records', 1));
    }

    public function test_librarian_cannot_access_behavior_records(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $librarian = $this->createUser($organization, 'librarian');

        $this->actingAs($librarian)
            ->get('/student-behavior')
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

    private function createAcademicYear(Organization $organization, string $name = '2026-2027'): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function seedStudent(Organization $organization): array
    {
        $year = $this->createAcademicYear($organization);
        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-1001',
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
            'effective_date' => '2026-04-10',
        ]);

        return [$student, $class, $year];
    }

    public function test_student_preferred_language_is_stored_and_validated(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        [$student, $class] = $this->seedStudent($organization);

        $this->actingAs($admin)
            ->post('/students', [
                'first_name' => 'Ananya',
                'middle_name' => 'Shrikant',
                'last_name' => 'Kulkarni',
                'first_name_mr' => 'अनन्या',
                'middle_name_mr' => 'श्रीकांत',
                'last_name_mr' => 'कुलकर्णी',
                'date_of_birth' => '2013-08-12',
                'gender' => 'female',
                'class' => $class->name,
                'section' => $class->section,
                'admission_date' => '2026-06-01',
                'preferred_language' => 'hi',
            ])
            ->assertRedirect();

        $stored = Student::query()->where('organization_id', $organization->id)
            ->where('first_name', 'Ananya')
            ->firstOrFail();

        $this->assertSame('hi', $stored->preferred_language);

        $this->actingAs($admin)
            ->patch("/students/{$student->id}", [
                'first_name' => 'Aarav',
                'middle_name' => 'Kumar',
                'last_name' => 'Mehta',
                'first_name_mr' => 'आरव',
                'middle_name_mr' => 'कुमार',
                'last_name_mr' => 'मेहता',
                'date_of_birth' => $student->date_of_birth,
                'gender' => $student->gender,
                'class' => $class->name,
                'section' => $class->section,
                'admission_date' => $student->admission_date,
                'preferred_language' => 'mr',
            ])
            ->assertRedirect();

        $this->assertSame('mr', $student->fresh()->preferred_language);

        $this->actingAs($admin)
            ->post('/students', [
                'first_name' => 'Rejected',
                'middle_name' => 'Bad',
                'last_name' => 'Err',
                'first_name_mr' => 'रिजेक्टेड',
                'middle_name_mr' => 'बॅड',
                'last_name_mr' => 'एरर',
                'date_of_birth' => '2013-08-12',
                'gender' => 'female',
                'class' => $class->name,
                'section' => $class->section,
                'admission_date' => '2026-06-01',
                'preferred_language' => 'fr',
            ])
            ->assertSessionHasErrors('preferred_language');
    }

    private function createRecord(Organization $organization, User $creator, Student $student, string $type): Incident
    {
        return Incident::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'type' => $type,
            'title' => 'Helped a classmate',
            'description' => null,
            'incident_date' => '2026-09-08',
            'status' => 'open',
            'action_taken' => null,
            'created_by' => $creator->id,
        ]);
    }
}