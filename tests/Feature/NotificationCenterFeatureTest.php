<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NotificationCenterFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = Organization::create([
            'name' => 'Notify School',
            'slug' => 'notify-school',
            'email' => 'school@notify.test',
            'phone' => '7777777999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $staff = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        return [$organization, $admin, $staff];
    }

    public function test_notifications_page_loads(): void
    {
        [$organization, $admin] = $this->seedContext();

        $this->actingAs($admin)->get('/notifications')->assertOk();
    }

    public function test_new_leave_request_notifies_admins(): void
    {
        [$organization, $admin, $staff] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/staff/leave-management', [
                'staff_id' => $staff->id,
                'leave_type' => 'casual',
                'from_date' => now()->format('Y-m-d'),
                'to_date' => now()->addDays(2)->format('Y-m-d'),
                'reason' => 'Personal work',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'title' => 'New Leave Request',
        ]);

        $notification = SystemNotification::query()
            ->where('user_id', $admin->id)
            ->latest()
            ->first();

        $this->assertStringContainsString($staff->name, $notification->message);
        $this->assertSame('Review Request', $notification->data['action_label']);
        $this->assertSame('/staff/leave-management', $notification->data['action_url']);
    }

    public function test_mark_all_as_read(): void
    {
        [$organization, $admin] = $this->seedContext();

        DB::table('notifications')->insert([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'type' => 'leave_request',
            'title' => 'New Leave Request',
            'message' => 'Test message',
            'data' => json_encode(['action_label' => 'Review', 'action_url' => '/staff/leave-management']),
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertEquals(1, SystemNotification::query()->where('user_id', $admin->id)->unread()->count());

        $this->actingAs($admin)
            ->post('/notifications/read-all')
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertEquals(0, SystemNotification::query()->where('user_id', $admin->id)->unread()->count());
    }

    public function test_mark_single_notification_as_read(): void
    {
        [$organization, $admin] = $this->seedContext();

        $notification = DB::table('notifications')->insertGetId([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'type' => 'leave_request',
            'title' => 'New Leave Request',
            'message' => 'Test message',
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post("/notifications/{$notification}/read")
            ->assertOk()
            ->assertJson(['ok' => true, 'unread' => 0]);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification,
            'is_read' => true,
        ]);
    }
}