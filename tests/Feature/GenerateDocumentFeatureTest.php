<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GenerateDocumentFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Print School',
            'slug' => 'print-school',
            'email' => 'school@print.test',
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
            'name' => 'Admin User',
            'email' => 'admin@print.test',
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
            'name' => '10',
            'section' => 'A',
            'room_number' => 'R1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organizationId,
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'priya@print.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'ADM-2001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
            'guardian_email' => 'rahul@guardian.test',
            'guardian_phone' => '7777777777',
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
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $templateId = DB::table('certificate_templates')->insertGetId([
            'organization_id' => $organizationId,
            'title' => 'Term Certificate',
            'type' => 'completion',
            'description' => 'Issued on completion.',
            'template_design' => 'blue',
            'design_settings' => json_encode([
                'preset' => 'blue',
                'watermark' => ['enabled' => true, 'text' => 'Print School', 'opacity' => 0.08, 'rotation' => -24, 'fontSize' => 72, 'color' => '#2563eb'],
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

        $admin = \App\Models\User::query()->find($adminId);

        return [$admin, $organizationId, $classId, $studentId, $templateId];
    }

    public function test_generate_document_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/documents/generate')->assertOk();
    }

    public function test_preview_builds_cards_for_class(): void
    {
        [$admin, $organizationId, $classId, $studentId] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/documents/generate/preview?' . http_build_query([
                'class' => $classId,
                'template' => null,
                'layout' => 'id_grid',
                'card' => 'cr80_portrait',
                'paper' => 'a4',
                'orientation' => 'portrait',
                'margin' => 5,
                'gap' => 2,
                'cut_marks' => 1,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GenerateDocumentPreview')
                ->has('cards', 1)
                ->has('sheet')
                ->where('cards.0.student.id', (string) $studentId));
    }

    public function test_preview_substitutes_student_name(): void
    {
        [$admin, $organizationId, $classId, $templateId] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/documents/generate/preview?' . http_build_query([
                'class' => $classId,
                'template' => $templateId,
                'layout' => 'certificate',
                'card' => 'cr80_landscape',
                'paper' => 'a4',
                'orientation' => 'landscape',
                'margin' => 5,
                'gap' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GenerateDocumentPreview')
                ->where('cards.0.design.elements.0.content', 'Priya Sharma'));
    }

    public function test_archive_creates_issued_certificates(): void
    {
        [$admin, $organizationId, $classId, $studentId, $templateId] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/documents/generate/archive', [
                'class' => $classId,
                'template' => $templateId,
                'date' => now()->toDateString(),
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('issued_certificates', [
            'organization_id' => $organizationId,
            'certificate_template_id' => $templateId,
            'student_id' => $studentId,
            'student_name' => 'Priya Sharma',
        ]);
    }
}