<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatUnreadFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_unread_total_after_sending_a_chat_message(): void
    {
        [$org, $sender, $other] = $this->chatUsers();

        $this->actingAs($sender)
            ->postJson('/chat/send', [
                'with' => $other->id,
                'message' => 'Hello from test',
            ])
            ->assertOk();

        $this->actingAs($other)
            ->getJson('/chat/unread')
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->actingAs($sender)
            ->getJson('/chat/unread')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_unread_goes_to_zero_after_reading_the_thread(): void
    {
        [$org, $sender, $other] = $this->chatUsers();

        $this->actingAs($sender)
            ->postJson('/chat/send', [
                'with' => $other->id,
                'message' => 'First message',
            ])
            ->assertOk();

        $this->actingAs($other)
            ->post('/chat/read?with=' . $sender->id)
            ->assertOk();

        $this->actingAs($other)
            ->getJson('/chat/unread')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_unread_ignores_messages_from_other_organizations(): void
    {
        [$org, $sender, $receiver] = $this->chatUsers();

        $otherOrg = Organization::create([
            'name' => 'Other Chat School',
            'slug' => 'other-chat-school',
            'email' => 'other@chat.test',
            'phone' => '8888888888',
            'address' => 'Other Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);

        $stranger = User::factory()->create([
            'organization_id' => $otherOrg->id,
            'role' => 'teacher',
            'name' => 'Other Org Teacher',
        ]);

        $this->actingAs($sender)
            ->postJson('/chat/send', [
                'with' => $receiver->id,
                'message' => 'Same org message',
            ])
            ->assertOk();

        $this->actingAs($stranger)
            ->getJson('/chat/unread')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    private function chatUsers(): array
    {
        $org = Organization::create([
            'name' => 'Chat School',
            'slug' => 'chat-school-unread',
            'email' => 'chat@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);

        $sender = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Teacher Unread',
        ]);

        $receiver = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Unread',
        ]);

        return [$org, $sender, $receiver];
    }
}