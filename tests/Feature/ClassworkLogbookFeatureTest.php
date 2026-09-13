<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassworkEntry;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassworkLogbookFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_lists_entries_with_class_records(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$class, $subject] = $this->seedContent($organization);

        ClassworkEntry::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'entry_type' => 'classwork',
            'title' => 'Algebra HW',
            'description' => 'Solve textbook problems 1-10',
            'entry_date' => '2026-08-05',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/classwork-logbook')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ClassworkLogbook')
                ->has('classRecords', 1)
                ->has('subjects', 1)
                ->has('entries', 1)
                ->where('entries.0.title', 'Algebra HW')
                ->where('entries.0.entry_type', 'classwork')
                ->where('entries.0.class', '10-A'));
    }

    public function test_type_and_class_filters(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$class, $subject] = $this->seedContent($organization);
        $otherClass = $this->createClass($organization, $class->academic_year_id, '8', 'B');

        ClassworkEntry::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'entry_type' => 'classwork',
            'title' => 'Classwork A',
            'entry_date' => '2026-08-05',
            'created_by' => $admin->id,
        ]);

        ClassworkEntry::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $otherClass->id,
            'subject_id' => $subject->id,
            'entry_type' => 'logbook',
            'title' => 'Logbook B',
            'entry_date' => '2026-08-06',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/classwork-logbook?type=logbook')
            ->assertInertia(fn ($page) => $page
                ->has('entries', 1)
                ->where('entries.0.title', 'Logbook B'));

        $this->actingAs($admin)
            ->get('/classwork-logbook?class='.$class->id)
            ->assertInertia(fn ($page) => $page
                ->has('entries', 1)
                ->where('entries.0.title', 'Classwork A'));

        $this->actingAs($admin)
            ->get('/classwork-logbook?date=2026-08-06')
            ->assertInertia(fn ($page) => $page
                ->has('entries', 1)
                ->where('entries.0.title', 'Logbook B'));
    }

    public function test_store_creates_entry(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$class, $subject] = $this->seedContent($organization);

        $this->actingAs($admin)
            ->from('/classwork-logbook')
            ->post('/classwork-logbook', [
                'entry_type' => 'classwork',
                'title' => 'Science practical',
                'description' => 'Record observations',
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'entry_date' => '2026-08-07',
            ])
            ->assertRedirect('/classwork-logbook')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('classwork_entries', [
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'entry_type' => 'classwork',
            'title' => 'Science practical',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $this->actingAs($admin)
            ->from('/classwork-logbook')
            ->post('/classwork-logbook', [
                'entry_type' => 'classwork',
            ])
            ->assertRedirect('/classwork-logbook')
            ->assertSessionHasErrors(['title', 'class_id', 'entry_date']);

        $this->assertDatabaseCount('classwork_entries', 0);
    }

    public function test_update_and_destroy(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        [$class, $subject] = $this->seedContent($organization);

        $entry = ClassworkEntry::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'entry_type' => 'logbook',
            'title' => 'Old title',
            'entry_date' => '2026-08-08',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/classwork-logbook/{$entry->id}", [
                'entry_type' => 'logbook',
                'title' => 'New title',
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'entry_date' => '2026-08-08',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('classwork_entries', ['id' => $entry->id, 'title' => 'New title']);

        $this->actingAs($admin)
            ->delete("/classwork-logbook/{$entry->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('classwork_entries', ['id' => $entry->id]);
    }

    public function test_teacher_can_view_and_add(): void
    {
        [$organization] = $this->seedOrganization();
        [$class, $subject] = $this->seedContent($organization);
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->get('/classwork-logbook')
            ->assertOk();

        $this->actingAs($teacher)
            ->from('/classwork-logbook')
            ->post('/classwork-logbook', [
                'entry_type' => 'classwork',
                'title' => 'Teacher entry',
                'class_id' => $class->id,
                'subject_id' => $subject->id,
                'entry_date' => '2026-08-09',
            ])
            ->assertRedirect('/classwork-logbook');

        $this->assertDatabaseHas('classwork_entries', ['title' => 'Teacher entry']);
    }

    public function test_cannot_modify_other_organizations_entry(): void
    {
        [$organization] = $this->seedOrganization();
        [$class] = $this->seedContent($organization);

        $other = Organization::query()->create([
            'name' => 'Other School',
            'slug' => 'other-school',
            'email' => 'other@gurukul.test',
            'phone' => '8888888888',
            'address' => 'Another Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 500,
            'max_staff' => 50,
            'settings' => [],
        ]);

        $foreignEntry = ClassworkEntry::query()->create([
            'organization_id' => $other->id,
            'class_id' => $class->id,
            'entry_type' => 'classwork',
            'title' => 'Foreign entry',
            'entry_date' => '2026-08-10',
            'created_by' => $this->createAdmin($other)->id,
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->patch("/classwork-logbook/{$foreignEntry->id}", [
                'entry_type' => 'classwork',
                'title' => 'Hacked',
                'class_id' => $class->id,
                'entry_date' => '2026-08-10',
            ])
            ->assertForbidden();

        $this->actingAs($admin)
            ->delete("/classwork-logbook/{$foreignEntry->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('classwork_entries', ['id' => $foreignEntry->id, 'title' => 'Foreign entry']);
    }

    private function seedOrganization(): array
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        return [$organization, $admin];
    }

    private function seedContent(Organization $organization): array
    {
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear->id);
        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'subject_code' => 'MATH-10',
        ]);
        $subject->classes()->attach($class->id);

        return [$class, $subject];
    }

    private function createClass(Organization $organization, int $academicYearId, string $name = '10', string $section = 'A'): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'name' => $name,
            'section' => $section,
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
    }

    private function createAdmin(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
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

    private function createAcademicYear(Organization $organization): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function createStudent(Organization $organization, SchoolClass $class): Student
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
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $class->academic_year_id,
            'class_id' => $class->id,
            'session' => '2026-2027',
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        return $student;
    }
}