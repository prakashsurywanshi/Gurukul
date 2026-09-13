<?php

namespace Tests\Feature;

use App\Events\SystemNotificationCreated;
use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SystemNotificationBroadcastFeatureTest extends TestCase
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

    public function test_leave_request_creation_dispatches_notification_broadcast(): void
    {
        Event::fake([SystemNotificationCreated::class]);

        [$org, $admin, $staff] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/staff/leave-management', [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(2)->format('Y-m-d'),
                'reason' => 'Personal work',
            ])
            ->assertRedirect();

        $notification = SystemNotification::query()
            ->where('user_id', $admin->id)
            ->where('title', 'New Leave Request')
            ->firstOrFail();

        Event::assertDispatched(SystemNotificationCreated::class, fn (SystemNotificationCreated $event) => (int) $event->notification->id === (int) $notification->id);
    }

    public function test_event_broadcasts_on_private_channel_scoped_to_recipient(): void
    {
        [$org, $admin, $staff] = $this->seedContext();

        $notification = SystemNotification::query()->create([
            'organization_id' => $org->id,
            'user_id' => $staff->id,
            'type' => 'leave_request',
            'title' => 'Leave Request Approved',
            'message' => 'Your casual leave request was approved.',
        ]);

        $event = new SystemNotificationCreated($notification);

        $this->assertInstanceOf(PrivateChannel::class, $event->broadcastOn());
        $this->assertSame('private-notifications.' . $staff->id, $event->broadcastOn()->name);
        $this->assertSame('SystemNotificationCreated', $event->broadcastAs());
    }

    public function test_notification_channel_authorization_allows_owner_only(): void
    {
        $this->usePusherChannels();
        [$org, $adminA, $adminB] = $this->seedTwoAdmins();

        $this->actingAs($adminA)->post('/broadcasting/auth', [
            'socket_id' => '4321.8765',
            'channel_name' => 'private-notifications.' . $adminA->id,
        ])->assertOk()->assertJsonStructure(['auth']);

        $this->actingAs($adminA)->post('/broadcasting/auth', [
            'socket_id' => '4321.8765',
            'channel_name' => 'private-notifications.' . $adminB->id,
        ])->assertStatus(403);
    }

    public function test_unauthenticated_channel_auth_is_rejected(): void
    {
        $this->usePusherChannels();

        $this->post('/broadcasting/auth', [
            'socket_id' => '4321.8765',
            'channel_name' => 'private-notifications.999',
        ])->assertStatus(403);
    }

    private function usePusherChannels(): void
    {
        Config::set('broadcasting.default', 'pusher');
        Broadcast::channel('notifications.{userId}', function (User $user, int $userId) {
            return $user->id === $userId;
        });
    }

    private function seedContext(): array
    {
        [$org, $adminA, $staff] = $this->seedTwoAdmins();

        return [$org, $adminA, $staff];
    }

    private function seedTwoAdmins(): array
    {
        $org = Organization::create([
            'name' => 'Broadcast School',
            'slug' => 'broadcast-school',
            'email' => 'broadcast@school.test',
            'phone' => '7777777999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);

        $adminA = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Alpha',
            'status' => 'active',
        ]);

        $adminB = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Beta',
            'status' => 'active',
        ]);

        $staff = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Staff Gamma',
            'status' => 'active',
        ]);

        return [$org, $adminA, $adminB, $staff];
    }
}