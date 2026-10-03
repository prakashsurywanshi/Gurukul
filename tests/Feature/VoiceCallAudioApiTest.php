<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\VoiceCallLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VoiceCallAudioApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_stream_their_organizations_voice_call_audio(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');

        Storage::disk('public')->put('voice-calls/sample.mp3', 'audio-bytes');

        $log = VoiceCallLog::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $admin->id,
            'audience_type' => 'students',
            'recipient_summary' => '1 student',
            'recipient_count' => 1,
            'recipient_phones' => ['919876543210'],
            'subject' => 'Reminder',
            'content' => 'Hello',
            'status' => 'completed',
            'audio_file_path' => 'voice-calls/sample.mp3',
            'audio_file_name' => 'sample.mp3',
            'audio_mime_type' => 'audio/mpeg',
        ]);

        Sanctum::actingAs($admin);

        $this->get("/api/communication/voice-calls/{$log->id}/audio")
            ->assertOk()
            ->assertHeader('content-type', 'audio/mpeg');
    }

    public function test_voice_call_audio_is_hidden_from_other_organizations(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');
        [, $otherAdmin] = $this->createOrganizationAndAdmin('beta-school', 'admin@beta.test');

        Storage::disk('public')->put('voice-calls/sample.mp3', 'audio-bytes');

        $log = VoiceCallLog::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $admin->id,
            'audience_type' => 'students',
            'recipient_summary' => '1 student',
            'recipient_count' => 1,
            'recipient_phones' => ['919876543210'],
            'subject' => 'Reminder',
            'content' => 'Hello',
            'status' => 'completed',
            'audio_file_path' => 'voice-calls/sample.mp3',
            'audio_file_name' => 'sample.mp3',
            'audio_mime_type' => 'audio/mpeg',
        ]);

        Sanctum::actingAs($otherAdmin);

        $this->getJson("/api/communication/voice-calls/{$log->id}/audio")
            ->assertNotFound();
    }

    public function test_missing_audio_returns_not_found(): void
    {
        [$organization, $admin] = $this->createOrganizationAndAdmin('alpha-school', 'admin@alpha.test');

        $log = VoiceCallLog::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $admin->id,
            'audience_type' => 'students',
            'recipient_summary' => '1 student',
            'recipient_count' => 1,
            'recipient_phones' => ['919876543210'],
            'subject' => 'Reminder',
            'content' => 'Hello',
            'status' => 'completed',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/communication/voice-calls/{$log->id}/audio")
            ->assertNotFound();
    }

    private function createOrganizationAndAdmin(string $slug, string $email): array
    {
        $organization = Organization::query()->create([
            'name' => ucfirst(explode('-', $slug)[0]).' School',
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
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
            'email' => $email,
        ]);

        return [$organization, $admin];
    }
}
