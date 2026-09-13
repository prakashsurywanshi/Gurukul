<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassIdExistsValidationTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    private SchoolClass $class;

    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::query()->create([
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

        app(StaffPermissionService::class)->ensureRolesExist($this->organization);

        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'admin',
            'email' => 'principal@gurukul.test',
            'status' => 'active',
        ]);

        $academicYear = AcademicYear::query()->create([
            'organization_id' => $this->organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->class = SchoolClass::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Class V',
            'section' => 'A',
            'status' => 'active',
        ]);

        $this->subject = Subject::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'theory',
        ]);
    }

    public function test_question_bank_accepts_valid_class_id(): void
    {
        $this->actingAs($this->admin)
            ->post('/question-bank', [
                'type' => 'mcq',
                'question' => 'What is 2+2?',
                'options' => ['3', '4', '5'],
                'correct_answer' => '4',
                'marks' => 2,
                'difficulty' => 'easy',
                'class_id' => $this->class->id,
                'subject_id' => $this->subject->id,
            ])
            ->assertRedirect(route('question-bank'));

        $this->assertDatabaseHas('questions', [
            'organization_id' => $this->organization->id,
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'question' => 'What is 2+2?',
        ]);
    }

    public function test_question_bank_rejects_invalid_class_id(): void
    {
        $this->actingAs($this->admin)
            ->post('/question-bank', [
                'type' => 'mcq',
                'question' => 'What is 2+2?',
                'options' => ['3', '4', '5'],
                'correct_answer' => '4',
                'marks' => 2,
                'difficulty' => 'easy',
                'class_id' => 999999,
            ])
            ->assertSessionHasErrors('class_id');

        $this->assertDatabaseCount('questions', 0);
    }

    public function test_study_material_accepts_valid_class_id(): void
    {
        $this->actingAs($this->admin)
            ->post('/study-materials', [
                'title' => 'Chapter 1 Notes',
                'class_id' => $this->class->id,
                'subject_id' => $this->subject->id,
                'url' => 'https://example.com/notes.pdf',
            ])
            ->assertRedirect(route('study-materials'));

        $this->assertDatabaseHas('study_materials', [
            'organization_id' => $this->organization->id,
            'class_id' => $this->class->id,
            'title' => 'Chapter 1 Notes',
        ]);
    }

    public function test_online_class_accepts_valid_class_id(): void
    {
        $this->actingAs($this->admin)
            ->post('/online-classes', [
                'title' => 'Maths live session',
                'provider' => 'zoom',
                'starts_at' => '2026-09-20 10:00:00',
                'class_id' => $this->class->id,
                'subject_id' => $this->subject->id,
            ])
            ->assertRedirect(route('online-classes'));

        $this->assertDatabaseHas('online_classes', [
            'organization_id' => $this->organization->id,
            'class_id' => $this->class->id,
            'title' => 'Maths live session',
        ]);
    }

    public function test_syllabus_unit_accepts_valid_class_id(): void
    {
        $this->actingAs($this->admin)
            ->post('/syllabus', [
                'title' => 'Fractions',
                'class_id' => $this->class->id,
                'subject_id' => $this->subject->id,
                'term' => 1,
            ])
            ->assertRedirect(route('syllabus'));

        $this->assertDatabaseHas('syllabus_units', [
            'organization_id' => $this->organization->id,
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'title' => 'Fractions',
        ]);
    }

    public function test_syllabus_unit_rejects_invalid_class_id(): void
    {
        $this->actingAs($this->admin)
            ->post('/syllabus', [
                'title' => 'Fractions',
                'class_id' => 999999,
                'subject_id' => $this->subject->id,
                'term' => 1,
            ])
            ->assertSessionHasErrors('class_id');

        $this->assertDatabaseCount('syllabus_units', 0);
    }
}