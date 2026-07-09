<?php

namespace Tests\Feature;

use App\Jobs\ImportStudentsJob;
use App\Mail\StudentWelcomeCredentialsMail;
use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\StudentImport;
use App\Models\User;
use App\Services\StudentImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_student_import_is_queued_without_creating_user_or_sending_welcome_email_during_request(): void
    {
        Mail::fake();
        Queue::fake();
        Storage::fake('local');

        $organization = Organization::query()->create([
            'name' => 'Test School',
            'slug' => 'test-school',
            'email' => 'school@example.com',
        ]);

        $academicYear = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'status' => 'active',
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $response = $this
            ->withoutMiddleware()
            ->actingAs($admin)
            ->post('/students/import', [
                'students' => [
                    [
                        'first_name' => 'John',
                        'last_name' => 'Doe',
                        'email' => 'john.doe@example.com',
                        'date_of_birth' => '2010-01-15',
                        'gender' => 'male',
                        'class' => '10',
                        'section' => 'A',
                        'admission_date' => '2026-04-01',
                    ],
                ],
            ]);

        $response->assertRedirect('/students');

        $this->assertDatabaseMissing('users', [
            'organization_id' => $organization->id,
            'email' => 'john.doe@example.com',
            'role' => 'student',
        ]);

        Mail::assertNotSent(StudentWelcomeCredentialsMail::class);
        Queue::assertPushed(
            ImportStudentsJob::class,
            fn (ImportStudentsJob $job) => $job->studentImportId === StudentImport::query()->first()?->id
        );

        $this->assertDatabaseHas('student_imports', [
            'organization_id' => $organization->id,
            'requested_by_user_id' => $admin->id,
            'status' => 'queued',
            'submitted_count' => 1,
        ]);

        Storage::disk('local')->assertExists('student-imports/import-'.StudentImport::query()->first()?->id.'.json');
    }

    public function test_student_import_continues_after_skipping_an_invalid_row(): void
    {
        $organization = Organization::query()->create([
            'name' => 'Test School',
            'slug' => 'test-school',
            'email' => 'school@example.com',
        ]);

        $academicYear = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'status' => 'active',
        ]);

        $result = app(StudentImportService::class)->import([
            [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john.doe@example.com',
                'date_of_birth' => '2010-01-15',
                'gender' => 'male',
                'class' => '10',
                'section' => 'A',
                'admission_date' => '2026-04-01',
            ],
            [
                'first_name' => 'Missing',
                'email' => 'missing.name@example.com',
                'date_of_birth' => '2010-01-16',
                'gender' => 'male',
                'class' => '10',
                'section' => 'A',
                'admission_date' => '2026-04-01',
            ],
            [
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'email' => 'jane.doe@example.com',
                'date_of_birth' => '2010-01-17',
                'gender' => 'female',
                'class' => '10',
                'section' => 'A',
                'admission_date' => '2026-04-01',
            ],
        ], $organization);

        $this->assertSame(2, $result['created_count']);
        $this->assertSame(1, $result['error_count']);
        $this->assertStringContainsString('Row 2', $result['errors'][0]);

        $this->assertDatabaseHas('students', [
            'organization_id' => $organization->id,
            'email' => 'john.doe@example.com',
        ]);
        $this->assertDatabaseHas('students', [
            'organization_id' => $organization->id,
            'email' => 'jane.doe@example.com',
        ]);
        $this->assertDatabaseMissing('students', [
            'organization_id' => $organization->id,
            'email' => 'missing.name@example.com',
        ]);
    }
}
