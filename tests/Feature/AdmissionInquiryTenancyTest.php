<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AdmissionInquiry;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AdmissionInquiryTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_admission_submission_attributes_inquiry_to_resolved_organization(): void
    {
        $organization = $this->createOrganization('public');

        $email = 'public-'.uniqid().'@example.com';
        $token = 'token-'.uniqid();
        Cache::store('file')->put('admission_inquiry_email_verified_'.$token, $email, now()->addMinutes(30));

        $this->post('/admissions?org='.$organization->slug, [
            'full_name' => 'Public Applicant',
            'email' => $email,
            'phone' => '9876543210',
            'program_interest' => '5',
            'previous_institution' => '',
            'message' => '',
            'email_verification_token' => $token,
        ])->assertRedirect();

        $inquiry = AdmissionInquiry::query()->where('email', $email)->first();

        $this->assertNotNull($inquiry);
        $this->assertSame($organization->id, (int) $inquiry->organization_id);
    }

    public function test_online_admission_index_only_lists_current_organization_inquiries(): void
    {
        $organization = $this->createOrganization('index');
        $otherOrganization = $this->createOrganization('other');
        $admin = $this->createAdmin($organization);

        $this->createInquiry($organization, ['full_name' => 'Mine A']);
        $this->createInquiry($otherOrganization, ['full_name' => 'Theirs B']);

        $this->actingAs($admin)
            ->get('/online-admission')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/students/OnlineAdmission')
                ->has('inquiries', 1)
                ->where('inquiries.0.full_name', 'Mine A'));
    }

    public function test_admin_cannot_enroll_update_or_delete_another_organizations_inquiry(): void
    {
        $organization = $this->createOrganization('guard');
        $otherOrganization = $this->createOrganization('guard-other');
        $admin = $this->createAdmin($organization);
        $class = $this->createClass($organization);
        $foreign = $this->createInquiry($otherOrganization);

        $this->actingAs($admin)->post("/online-admission/{$foreign->id}/enroll", [
            'class_id' => $class->id,
            'date_of_birth' => '2013-09-09',
            'gender' => 'male',
            'admission_date' => '2026-06-10',
        ])->assertNotFound();

        $this->actingAs($admin)->patch("/online-admission/{$foreign->id}", [
            'full_name' => 'Hijacked',
        ])->assertNotFound();

        $this->actingAs($admin)->delete("/online-admission/{$foreign->id}")->assertNotFound();

        $this->assertSame('pending', $foreign->fresh()->status);
        $this->assertSame('Inquiry Student', $foreign->fresh()->full_name);
    }

    public function test_enrolling_legacy_inquiry_adopts_current_organization(): void
    {
        $organization = $this->createOrganization('adopt');
        $admin = $this->createAdmin($organization);
        $class = $this->createClass($organization);
        $inquiry = $this->createInquiry(null);

        $this->assertNull($inquiry->organization_id);

        $this->actingAs($admin)->post("/online-admission/{$inquiry->id}/enroll", [
            'class_id' => $class->id,
            'date_of_birth' => '2013-09-09',
            'gender' => 'male',
            'admission_date' => '2026-06-10',
        ])->assertRedirect();

        $inquiry->refresh();

        $this->assertSame($organization->id, (int) $inquiry->organization_id);
        $this->assertSame('enrolled', $inquiry->status);
        $this->assertNotNull($inquiry->enrolled_student_id);
        $this->assertSame(
            $organization->id,
            (int) Student::query()->whereKey($inquiry->enrolled_student_id)->value('organization_id')
        );
    }

    private function createOrganization(string $suffix): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Tenancy School '.$suffix,
            'slug' => 'tenancy-school-'.$suffix.'-'.$counter,
            'email' => 'tenancy-'.$suffix.'-'.$counter.'@example.com',
            'status' => 'active',
        ]);
    }

    private function createClass(Organization $organization): SchoolClass
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '5',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 30,
            'status' => 'active',
        ]);
    }

    private function createAdmin(Organization $organization): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => 'Admin '.$counter,
            'email' => 'tenancy-admin-'.$counter.'@example.com',
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);
    }

    private function createInquiry(?Organization $organization, array $overrides = []): AdmissionInquiry
    {
        static $counter = 0;
        $counter++;

        return AdmissionInquiry::query()->create(array_merge([
            'organization_id' => $organization?->id,
            'full_name' => 'Inquiry Student',
            'email' => 'inquiry-'.$counter.'-'.uniqid().'@example.com',
            'phone' => '9999999999',
            'program_interest' => '5',
            'student_stage' => 'Not provided',
            'status' => 'pending',
        ], $overrides));
    }
}
