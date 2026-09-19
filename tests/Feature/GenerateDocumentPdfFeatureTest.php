<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GenerateDocumentPdfFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Grid Print School',
            'slug' => 'grid-print-school',
            'email' => 'school@gridprint.test',
            'phone' => '5555555555',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'Print Admin',
            'email' => 'admin@gridprint.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organizationId,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $organizationId,
            'academic_year_id' => $academicYearId,
            'name' => '8',
            'section' => 'B',
            'room_number' => 'R2',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organizationId,
            'first_name' => 'Aditya',
            'last_name' => 'Joshi',
            'email' => 'aditya@gridprint.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'GRID-3001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(13)->toDateString(),
            'guardian_name' => 'Vikram Joshi',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organizationId,
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $templateId = DB::table('certificate_templates')->insertGetId([
            'organization_id' => $organizationId,
            'title' => 'Grid Certificate',
            'type' => 'completion',
            'description' => 'Issued on completion.',
            'template_design' => 'blue',
            'design_settings' => json_encode([
                'preset' => 'blue',
                'watermark' => ['enabled' => true, 'text' => 'Grid Print School', 'opacity' => 0.08, 'rotation' => -24, 'fontSize' => 72, 'color' => '#2563eb'],
                'elements' => [
                    [
                        'id' => 'student_name',
                        'kind' => 'variable',
                        'content' => '{{student_name}}',
                        'x' => 130,
                        'y' => 274,
                        'width' => 540,
                        'fontSize' => 36,
                        'fontFamily' => 'Georgia',
                        'fontWeight' => 'bold',
                        'fontStyle' => 'normal',
                        'textDecoration' => 'none',
                        'color' => '#111827',
                        'align' => 'center',
                    ],
                ],
            ]),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$adminId, $organizationId, $classId, $studentId, $templateId];
    }

    private function pdfQuery(int $classId, ?int $templateId = null, string $layout = 'id_grid'): array
    {
        return [
            'class' => $classId,
            'template' => $templateId,
            'layout' => $layout,
            'card' => 'cr80_portrait',
            'paper' => 'a4',
            'orientation' => 'portrait',
            'margin' => 5,
            'gap' => 2,
            'cut_marks' => 1,
            'align_center' => 1,
        ];
    }

    public function test_grid_sheet_pdf_downloads(): void
    {
        [$adminId, $organizationId, $classId] = $this->seedContext();

        $response = $this->actingAs(User::query()->find($adminId))
            ->get('/documents/generate/pdf?'.http_build_query($this->pdfQuery($classId)));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $disposition = (string) $response->headers->get('content-disposition');
        $this->assertStringContainsString('attachment', $disposition);
        $this->assertStringContainsString('.pdf', $disposition);
        $contentLength = (int) $response->headers->get('content-length', 0);
        $this->assertGreaterThan(500, $contentLength);
    }

    public function test_certificate_layout_pdf_downloads(): void
    {
        [$adminId, $organizationId, $classId, $templateId] = $this->seedContext();

        $this->actingAs(User::query()->find($adminId))
            ->get('/documents/generate/pdf?'.http_build_query($this->pdfQuery($classId, $templateId, 'certificate')))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_pdf_rejects_missing_class(): void
    {
        [$adminId] = $this->seedContext();

        $this->actingAs(User::query()->find($adminId))
            ->get('/documents/generate/pdf?layout=id_grid&card=cr80_portrait&paper=a4&orientation=portrait&margin=5&gap=2')
            ->assertRedirect()
            ->assertSessionHasErrors('class');
    }

    public function test_pdf_rejects_unknown_paper(): void
    {
        [$adminId, $organizationId, $classId] = $this->seedContext();

        $query = $this->pdfQuery($classId);
        $query['paper'] = 'poster';

        $this->actingAs(User::query()->find($adminId))
            ->get('/documents/generate/pdf?'.http_build_query($query))
            ->assertRedirect()
            ->assertSessionHasErrors('paper');
    }
}