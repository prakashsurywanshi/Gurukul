<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Models\VoiceCallLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VoiceCallsSmartfloTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_smartflo_voice_settings(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();

        $response = $this->actingAs($user)->patch('/settings/communication', [
            'sms' => [
                'enabled' => true,
                'provider' => 'MSG91',
                'senderId' => 'GURUKL',
                'apiKey' => '',
            ],
            'email' => [
                'enabled' => true,
                'mailer' => 'SMTP',
                'host' => 'smtp.gmail.com',
                'port' => '587',
                'username' => 'school@example.com',
                'fromAddress' => 'noreply@gurukul.com',
                'fromName' => 'Gurukul ERP',
            ],
            'whatsapp' => [
                'enabled' => false,
                'provider' => 'Twilio',
                'phoneNumberId' => '',
                'accessToken' => '',
                'businessNumber' => '+91 9876543210',
            ],
            'qwa' => [
                'enabled' => false,
            ],
            'voice' => [
                'enabled' => true,
                'provider' => 'Smartflo',
                'apiKey' => 'smartflo-api-key',
                'callerId' => '918069412345',
                'ringTimeout' => 25,
                'callTimeout' => 90,
            ],
        ]);

        $response->assertRedirect('/settings/communication');

        $organization->refresh();

        $this->assertSame('smartflo-api-key', data_get($organization->settings, 'communication_settings.voice.apiKey'));
        $this->assertSame('918069412345', data_get($organization->settings, 'communication_settings.voice.callerId'));
        $this->assertSame(25, data_get($organization->settings, 'communication_settings.voice.ringTimeout'));
    }

    public function test_voice_call_submission_uses_smartflo_and_saves_history(): void
    {
        Http::fake([
            'https://api-smartflo.tatateleservices.com/v1/click_to_call_support' => Http::response([
                'success' => true,
                'message' => 'queued',
                'request_id' => 'REQ-1001',
            ], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin([
            'communication_settings' => [
                'voice' => [
                    'enabled' => true,
                    'provider' => 'Smartflo',
                    'apiKey' => 'smartflo-api-key',
                    'callerId' => '918069412345',
                    'ringTimeout' => 20,
                    'callTimeout' => 120,
                ],
            ],
        ]);

        $academicYear = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-2026-0001',
            'first_name' => 'Riya',
            'last_name' => 'Sharma',
            'email' => 'riya@example.com',
            'date_of_birth' => '2013-02-10',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'father_phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'session' => $academicYear->name,
            'roll_number' => '1',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        $response = $this->actingAs($user)->post('/communication/voice-calls', [
            'audienceType' => 'students',
            'subject' => 'Attendance Reminder',
            'content' => 'Please connect with the school office.',
        ]);

        $response->assertRedirect('/communication/voice-calls');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api-smartflo.tatateleservices.com/v1/click_to_call_support'
                && $request['customer_number'] === '919876543210'
                && $request['api_key'] === 'smartflo-api-key'
                && $request['caller_id'] === '918069412345';
        });

        $this->assertDatabaseHas('voice_call_logs', [
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'audience_type' => 'students',
            'subject' => 'Attendance Reminder',
            'status' => 'completed',
        ]);

        $log = VoiceCallLog::query()->firstOrFail();

        $this->assertSame(['919876543210'], $log->recipient_phones);
        $this->assertSame('REQ-1001', $log->provider_reference);
    }

    private function createOrganizationAndAdmin(array $settings = []): array
    {
        $organization = Organization::query()->create([
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
            'settings' => $settings,
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
        ]);

        return [$organization, $user];
    }
}
