<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\TranslationService;
use App\Support\LanguageCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BilingualLanguageTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_update_persists_dual_and_universal_language_modes(): void
    {
        $organization = $this->createOrganization();
        $this->createCurrentSession($organization);
        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->patch('/settings', [
                'name' => $organization->name,
                'email' => $organization->email,
                'phone' => $organization->phone,
                'address' => $organization->address,
                'city' => $organization->city,
                'state' => $organization->state,
                'pincode' => $organization->pincode,
                'website' => $organization->website,
                'academicSession' => '2026-2027',
                'dateFormat' => 'DD-MM-YYYY',
                'dualLanguageEnabled' => true,
                'regionalLanguage' => 'mr',
                'universalLanguageEnabled' => true,
                'availableUniversalLanguages' => ['en', 'mr', 'hi'],
            ])
            ->assertRedirect();

        $organization->refresh();
        $languageSettings = $organization->settings['language_settings'] ?? [];

        $this->assertTrue($languageSettings['dual_language_enabled']);
        $this->assertTrue($languageSettings['universal_language_enabled']);
        $this->assertEquals('mr', $languageSettings['regional_language']);
        $this->assertEquals(['en', 'mr', 'hi'], $languageSettings['available_universal_languages']);
    }

    public function test_student_marathi_fields_persist_and_localized_falls_back_to_english(): void
    {
        $organization = $this->createOrganization();
        $year = $this->createCurrentSession($organization);
        $class = \App\Models\SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Class 5',
            'section' => 'A',
            'status' => 'active',
            'academic_year_id' => $year->id,
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM001',
            'first_name' => 'Raj',
            'last_name' => 'Patil',
            'first_name_mr' => 'राज',
            'last_name_mr' => 'पाटील',
            'father_name' => 'Ramesh',
            'date_of_birth' => '2015-01-01',
            'admission_date' => '2026-06-01',
            'gender' => 'male',
            'status' => 'active',
        ]);

        $this->assertEquals('राज', $student->localized('first_name', 'mr'));
        $this->assertEquals('Raj', $student->localized('first_name', 'en'));
        $this->assertEquals('पाटील', $student->localized('last_name', 'mr'));
        $this->assertEquals('Ramesh', $student->localized('father_name', 'mr'));
    }

    public function test_certificate_issue_stores_regional_name_snapshot(): void
    {
        $organization = $this->createOrganization();
        $year = $this->createCurrentSession($organization);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Class 4',
            'section' => 'B',
            'status' => 'active',
            'academic_year_id' => $year->id,
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM100',
            'first_name' => 'Sneha',
            'last_name' => 'Kulkarni',
            'first_name_mr' => 'स्नेहा',
            'last_name_mr' => 'कुलकर्णी',
            'date_of_birth' => '2016-05-05',
            'admission_date' => '2026-06-01',
            'gender' => 'female',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $year->id,
            'class_id' => $class->id,
            'session' => $year->name,
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-06-01',
            'status' => 'active',
        ]);

        $template = CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Merit Certificate',
            'type' => 'merit',
            'template_design' => 'red',
            'design_settings' => [],
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->post('/certificates/issue-bulk', [
                'certificate_template_id' => $template->id,
                'student_ids' => [$student->id],
                'reason' => 'Excellent performance',
                'date' => '2026-08-15',
            ])
            ->assertRedirect();

        $issued = $student->issuedCertificates()->first();

        $this->assertNotNull($issued);
        $this->assertEquals('Sneha Kulkarni', $issued->student_name);
        $this->assertEquals('स्नेहा कुलकर्णी', $issued->student_name_mr);
    }

    public function test_translation_service_returns_original_text_when_provider_unavailable(): void
    {
        Http::fake([
            '*' => Http::response([], 503),
        ]);

        $service = new TranslationService();

        $this->assertEquals('Hello World', $service->translate('Hello World', 'mr'));
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

    private function createCurrentSession(Organization $organization): AcademicYear
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
}
