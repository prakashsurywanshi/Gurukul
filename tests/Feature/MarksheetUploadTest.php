<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\MarksheetUpload;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MarksheetUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_marksheet_upload_list(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);

        $this->createUpload($organization, $admin, $student, $exam);

        $this->actingAs($admin)
            ->get('/marksheet/upload-list')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/MarksheetUploads')
                ->has('uploads', 1)
                ->where('uploads.0.title', 'Final Term Marksheet')
            );
    }

    public function test_admin_can_upload_marksheet_pdf(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);

        $file = UploadedFile::fake()->create('marksheet.pdf', 100, 'application/pdf');

        $this->actingAs($admin)
            ->post('/marksheet/upload', [
                'student_id' => $student->id,
                'exam_id' => $exam->id,
                'title' => 'Half Yearly',
                'marksheet_file' => $file,
            ])
            ->assertRedirect();

        $upload = MarksheetUpload::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($upload);
        $this->assertSame('Half Yearly', $upload->title);
        $this->assertSame('marksheet.pdf', $upload->original_name);
        $this->assertSame($student->id, $upload->student_id);
        $this->assertSame($exam->id, $upload->exam_id);
        $this->assertSame('uploaded', $upload->status);

        Storage::disk('local')->assertExists($upload->storage_path);
    }

    public function test_upload_requires_pdf_and_title(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);

        $this->actingAs($admin)
            ->post('/marksheet/upload', [
                'student_id' => $student->id,
                'exam_id' => $exam->id,
                'title' => '',
                'marksheet_file' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertSessionHasErrors(['title', 'marksheet_file']);
    }

    public function test_admin_can_verify_upload(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $upload = $this->createUpload($organization, $admin, $student, $exam);

        $this->actingAs($admin)
            ->post("/marksheet/upload-list/{$upload->id}/verify")
            ->assertRedirect();

        $this->assertSame('verified', $upload->fresh()->status);
    }

    public function test_admin_can_download_upload(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $upload = $this->createUpload($organization, $admin, $student, $exam);
        Storage::disk('local')->put($upload->storage_path, 'pdf-bytes');

        $this->actingAs($admin)
            ->get("/marksheet/upload-list/{$upload->id}/download")
            ->assertOk()
            ->assertDownload($upload->original_name);
    }

    public function test_admin_can_delete_upload(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $upload = $this->createUpload($organization, $admin, $student, $exam);
        Storage::disk('local')->put($upload->storage_path, 'pdf-bytes');

        $this->actingAs($admin)
            ->delete("/marksheet/upload-list/{$upload->id}")
            ->assertRedirect();

        $this->assertNull(MarksheetUpload::query()->find($upload->id));
        Storage::disk('local')->assertMissing($upload->storage_path);
    }

    public function test_other_organization_cannot_access_upload(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($other, 'admin');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $upload = $this->createUpload($organization, $admin, $student, $exam);

        $this->actingAs($otherAdmin)
            ->get("/marksheet/upload-list/{$upload->id}/download")
            ->assertNotFound();
    }

    public function test_teacher_can_view_but_not_delete(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');
        $academicYear = $this->createAcademicYear($organization);
        $class = $this->createClass($organization, $academicYear);
        $exam = $this->createExam($organization, $academicYear);
        $student = $this->createStudent($organization, $class);
        $upload = $this->createUpload($organization, $admin, $student, $exam);

        $this->actingAs($teacher)
            ->get('/marksheet/upload-list')
            ->assertOk();

        // Teacher has add/edit permissions, can view and verify
        Storage::disk('local')->put($upload->storage_path, 'pdf-bytes');

        $this->actingAs($teacher)
            ->get("/marksheet/upload-list/{$upload->id}/download")
            ->assertOk();

        $this->actingAs($teacher)
            ->post("/marksheet/upload-list/{$upload->id}/verify")
            ->assertRedirect();

        // Teacher has NO delete permission
        $this->actingAs($teacher)
            ->delete("/marksheet/upload-list/{$upload->id}")
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

    private function createAcademicYear(Organization $organization): AcademicYear
    {
        return AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-27',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);
    }

    private function createClass(Organization $organization, AcademicYear $academicYear): SchoolClass
    {
        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Class 5',
            'section' => 'A',
            'status' => 'active',
        ]);
    }

    private function createExam(Organization $organization, AcademicYear $academicYear): Exam
    {
        return Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Term 1',
            'exam_type' => 'term',
            'start_date' => '2026-04-10',
            'end_date' => '2026-04-30',
            'status' => 'scheduled',
        ]);
    }

    private function createStudent(Organization $organization, SchoolClass $class): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-1001',
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'class_id' => $class->id,
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);
    }

    private function createUpload(
        Organization $organization,
        User $uploader,
        Student $student,
        Exam $exam
    ): MarksheetUpload {
        return MarksheetUpload::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'exam_id' => $exam->id,
            'title' => 'Final Term Marksheet',
            'storage_path' => 'marksheets/org-'.$organization->id.'/marksheet.pdf',
            'original_name' => 'marksheet.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'status' => 'uploaded',
            'uploaded_by_user_id' => $uploader->id,
        ]);
    }
}