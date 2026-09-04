<?php

namespace Tests\Feature;

use App\Jobs\SendQwaWhatsappMessageJob;
use App\Models\Message;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class QwaWhatsappResendTest extends TestCase
{
    use RefreshDatabase;

    private function createOrganizationAndAdmin(): array
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
            'settings' => [
                'communication_settings' => [
                    'qwa' => [
                        'enabled' => true,
                        'baseUrl' => 'https://qwa.qodeigence.com',
                        'apiKey' => encrypt('test-api-key'),
                        'sessionId' => 'test-session',
                    ],
                ],
            ],
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
        ]);

        return [$organization, $user];
    }

    private function createQwaMessage(Organization $organization, User $user, string $status = 'failed'): Message
    {
        return Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => 'Exam reminder',
            'message' => 'Bring your hall tickets.',
            'attachments' => [
                'channel' => 'qwa_whatsapp',
                'qwa_whatsapp' => [
                    'recipient_summary' => 'Students of I-A',
                    'recipient_count' => 2,
                    'recipient_numbers' => ['919021446889', '918975020593'],
                    'status' => $status,
                    'session_id' => 'test-session',
                    'message_type' => 'text',
                    'media_path' => null,
                    'media_mime' => null,
                    'media_filename' => null,
                    'media_caption' => null,
                    'queued_at' => now()->subHour()->toDateTimeString(),
                    'successful_count' => 0,
                    'failed_count' => 2,
                    'pending_count' => 0,
                    'delay_min_seconds' => 3,
                    'delay_max_seconds' => 6,
                    'responses' => [
                        ['recipient_index' => 0, 'phone' => '919021446889', 'success' => false, 'message' => 'Session is not active.'],
                        ['recipient_index' => 1, 'phone' => '918975020593', 'success' => false, 'message' => 'Session is not active.'],
                    ],
                    'recipients' => [
                        ['name' => 'Tejas', 'phone' => '919021446889', 'status' => 'failed', 'scheduled_at' => null, 'sent_at' => null, 'failed_reason' => 'Session is not active.'],
                        ['name' => 'Prakash', 'phone' => '918975020593', 'status' => 'failed', 'scheduled_at' => null, 'sent_at' => null, 'failed_reason' => 'Session is not active.'],
                    ],
                ],
            ],
            'priority' => 'normal',
            'is_announcement' => false,
        ]);
    }

    public function test_admin_can_resend_a_failed_qwa_message_to_the_same_recipients(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session' => Http::response(['status' => 'ready'], 200),
        ]);

        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $message = $this->createQwaMessage($organization, $user);

        $response = $this->actingAs($user)->post("/communication/send-qwa-whatsapp/{$message->id}/resend");

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $message->refresh();
        $meta = $message->attachments['qwa_whatsapp'];

        $this->assertSame('queued', $meta['status']);
        $this->assertSame(0, $meta['successful_count']);
        $this->assertSame(0, $meta['failed_count']);
        $this->assertSame(2, $meta['pending_count']);
        $this->assertSame([], $meta['responses']);
        $this->assertSame('test-session', $meta['session_id']);
        $this->assertSame('pending', $meta['recipients'][0]['status']);
        $this->assertNull($meta['recipients'][0]['failed_reason']);
        $this->assertSame('919021446889', $meta['recipients'][0]['phone']);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 2);
    }

    public function test_resend_is_blocked_when_qwa_session_is_not_connected(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session' => Http::response(['status' => 'disconnected'], 200),
        ]);

        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $message = $this->createQwaMessage($organization, $user);

        $response = $this->actingAs($user)->post("/communication/send-qwa-whatsapp/{$message->id}/resend");

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHasErrors('qwa_delivery');

        $message->refresh();
        $this->assertSame('failed', $message->attachments['qwa_whatsapp']['status']);
        $this->assertSame(0, $message->attachments['qwa_whatsapp']['pending_count']);

        Queue::assertNotPushed(SendQwaWhatsappMessageJob::class);
    }

    public function test_resend_is_blocked_when_message_has_no_recipients(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session' => Http::response(['status' => 'ready'], 200),
        ]);

        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $message = $this->createQwaMessage($organization, $user);

        $message->forceFill([
            'attachments' => [
                'channel' => 'qwa_whatsapp',
                'qwa_whatsapp' => [
                    'recipient_count' => 0,
                    'recipient_numbers' => [],
                    'status' => 'failed',
                    'recipients' => [],
                ],
            ],
        ])->save();

        $response = $this->actingAs($user)->post("/communication/send-qwa-whatsapp/{$message->id}/resend");

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHasErrors('qwa_recipients');

        Queue::assertNotPushed(SendQwaWhatsappMessageJob::class);
    }
}
