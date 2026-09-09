<?php

namespace Tests\Feature;

use App\Events\ChatMessageSent;
use App\Models\Organization;
use App\Models\Message;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChatRealtimeFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('broadcasting.connections.pusher.key', 'test-key');
        Config::set('broadcasting.connections.pusher.secret', 'test-secret');
        Config::set('broadcasting.connections.pusher.app_id', 'test-app');
        Config::set('broadcasting.connections.pusher.options.host', '127.0.0.1');
    }

    public function test_send_creates_message_and_dispatches_broadcast_event(): void
    {
        Event::fake([ChatMessageSent::class]);

        [$org, $sender, $other] = $this->chatUsers();

        $this->actingAs($sender)->postJson('/chat/send', [
            'with' => $other->id,
            'message' => 'Hello from test',
        ])->assertOk()->assertJsonPath('ok', true);

        $message = Message::query()->firstOrFail();
        $this->assertSame('Hello from test', $message->message);
        $this->assertSame($sender->id, $message->sender_id);
        $this->assertDatabaseHas('message_recipients', ['message_id' => $message->id, 'recipient_id' => $other->id]);

        Event::assertDispatched(ChatMessageSent::class, fn (ChatMessageSent $event) => $event->recipientId === $other->id && $event->senderId === $sender->id);
    }

    public function test_private_channel_authorization_allows_owner_only(): void
    {
        $this->usePusherChannels();
        [$org, $userA, $userB] = $this->chatUsers();

        $this->actingAs($userA)->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-chat.' . $userA->id,
        ])->assertOk()->assertJsonStructure(['auth']);

        $this->actingAs($userA)->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-chat.' . $userB->id,
        ])->assertStatus(403);
    }

    public function test_unauthenticated_channel_auth_is_rejected(): void
    {
        $this->usePusherChannels();

        $this->post('/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-chat.999',
        ])->assertStatus(403);
    }

    public function test_chat_inbox_loads_when_students_have_linked_users(): void
    {
        Event::fake();

        [$org, $admin, $other] = $this->chatUsers();

        $studentUser = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'student',
            'name' => 'Riya Sharma',
        ]);

        Student::query()->create([
            'organization_id' => $org->id,
            'user_id' => $studentUser->id,
            'admission_no' => 'ADM-0001',
            'first_name' => 'Riya',
            'last_name' => 'Sharma',
            'date_of_birth' => '2013-02-10',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/chat')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/Chat'));
    }

    private function usePusherChannels(): void
    {
        Config::set('broadcasting.default', 'pusher');
        Broadcast::channel('chat.{userId}', function (User $user, int $userId) {
            return $user->id === $userId;
        });
    }

    private function chatUsers(): array
    {
        $org = Organization::create($this->orgFields('Chat School', 'chat-school'));

        $sender = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Teacher One',
            'password' => Hash::make('secret'),
        ]);

        $other = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin One',
            'password' => Hash::make('secret'),
        ]);

        return [$org, $sender, $other];
    }

    private function orgFields(string $name, string $slug): array
    {
        return [
            'name' => $name,
            'slug' => $slug,
            'email' => $slug . '@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ];
    }
}