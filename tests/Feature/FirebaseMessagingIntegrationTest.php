<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Models\UserDeviceToken;
use App\Services\FirebaseCloudMessagingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class FirebaseMessagingIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_register_and_remove_a_device_token(): void
    {
        $organization = Organization::create([
            'name' => 'Springfield School',
            'slug' => 'springfield-school',
            'email' => 'school@example.com',
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/device-token', [
                'token' => 'firebase-token-123',
                'platform' => 'android',
                'device_name' => 'Pixel 8',
            ])
            ->assertOk()
            ->assertJson([
                'message' => 'Device token registered successfully.',
            ]);

        $this->assertDatabaseHas('user_device_tokens', [
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'token' => 'firebase-token-123',
            'platform' => 'android',
        ]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/auth/device-token', [
                'token' => 'firebase-token-123',
            ])
            ->assertOk()
            ->assertJson([
                'message' => 'Device token removed successfully.',
            ]);

        $this->assertDatabaseMissing('user_device_tokens', [
            'token' => 'firebase-token-123',
        ]);
    }

    public function test_message_send_triggers_fcm_for_student_users(): void
    {
        $organization = Organization::create([
            'name' => 'Springfield School',
            'slug' => 'springfield-school',
            'email' => 'school@example.com',
        ]);

        $sender = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $studentUser = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'student',
            'status' => 'active',
        ]);

        Student::create([
            'organization_id' => $organization->id,
            'user_id' => $studentUser->id,
            'admission_no' => 'ADM-001',
            'first_name' => 'Bart',
            'last_name' => 'Simpson',
            'date_of_birth' => '2012-01-10',
            'gender' => 'male',
            'admission_date' => '2024-06-01',
            'status' => 'active',
            'email' => 'bart@example.com',
        ]);

        UserDeviceToken::create([
            'user_id' => $studentUser->id,
            'organization_id' => $organization->id,
            'token' => 'student-device-token',
            'platform' => 'android',
            'last_used_at' => now(),
        ]);

        $mock = Mockery::mock(FirebaseCloudMessagingService::class);
        $mock->shouldReceive('sendToUsers')
            ->once()
            ->with(
                [$studentUser->id],
                'Exam Reminder',
                Mockery::type('string'),
                Mockery::on(fn (array $payload) => ($payload['type'] ?? null) === 'message'),
                Mockery::on(fn ($org) => $org instanceof Organization && $org->getKey() === $organization->getKey())
            )
            ->andReturn([
                'configured' => true,
                'attemptedCount' => 1,
                'successCount' => 1,
                'failureCount' => 0,
                'invalidTokens' => [],
                'errors' => [],
            ]);
        $mock->shouldReceive('isConfigured')->andReturn(true);
        $this->app->instance(FirebaseCloudMessagingService::class, $mock);

        $this->actingAs($sender, 'sanctum')
            ->postJson('/api/communication/messages', [
                'subject' => 'Exam Reminder',
                'message' => 'Your exam starts tomorrow at 9 AM.',
                'audienceType' => 'students',
                'sendNotification' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.recipientCount', 1)
            ->assertJsonPath('data.notification.successCount', 1)
            ->assertJsonPath('data.notification.failureCount', 0);

        $this->assertDatabaseHas('message_recipients', [
            'recipient_id' => $studentUser->id,
        ]);
    }
}
