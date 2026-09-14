<?php

namespace Tests\Feature;

use App\Http\Controllers\NotificationCenterController;
use App\Models\NotificationRule;
use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\SystemNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationEngineFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_should_notify_returns_true_by_default_for_known_event_type(): void
    {
        $organization = $this->createOrganization();
        $service = app(SystemNotificationService::class);

        $this->assertTrue($service->shouldNotify($organization, 'leave_request'));
        $this->assertTrue($service->shouldNotify($organization, 'fee_concession'));
    }

    public function test_should_notify_returns_false_when_push_notifications_disabled(): void
    {
        $organization = $this->createOrganization();
        $organization->update(['settings' => ['notification_settings' => ['push_notifications' => false]]]);
        $service = app(SystemNotificationService::class);

        $this->assertFalse($service->shouldNotify($organization, 'leave_request'));
    }

    public function test_should_notify_returns_false_when_event_setting_gate_disabled(): void
    {
        $organization = $this->createOrganization();
        $organization->update(['settings' => ['notification_settings' => ['push_notifications' => true, 'attendance_alerts' => false]]]);
        $service = app(SystemNotificationService::class);

        $this->assertFalse($service->shouldNotify($organization, 'attendance_correction'));
        $this->assertTrue($service->shouldNotify($organization, 'leave_request'));
    }

    public function test_notify_admins_respects_rule_recipient_roles(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        NotificationRule::query()->create([
            'organization_id' => $organization->id,
            'event_type' => 'leave_request',
            'label' => 'Leave Request',
            'is_active' => true,
            'channels' => ['bell'],
            'recipient_roles' => ['teacher', 'accountant'],
        ]);

        app(SystemNotificationService::class)->notifyAdmins($organization, 'leave_request', 'Leave', 'New leave');

        $this->assertDatabaseHas('notifications', ['user_id' => $teacher->id, 'type' => 'leave_request']);
        $this->assertDatabaseMissing('notifications', ['user_id' => $admin->id, 'type' => 'leave_request']);
    }

    public function test_notify_admins_skips_inactive_rules(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');

        NotificationRule::query()->create([
            'organization_id' => $organization->id,
            'event_type' => 'complaint',
            'label' => 'Complaint',
            'is_active' => false,
            'channels' => ['bell'],
        ]);

        app(SystemNotificationService::class)->notifyAdmins($organization, 'complaint', 'Complaint', 'New complaint');

        $this->assertDatabaseMissing('notifications', ['user_id' => $admin->id, 'type' => 'complaint']);
    }

    public function test_resolve_rule_creates_lazily(): void
    {
        $organization = $this->createOrganization();
        $service = app(SystemNotificationService::class);

        $this->assertDatabaseCount('notification_rules', 0);

        $rule = $service->resolveRule($organization, 'fee_due');

        $this->assertNotNull($rule);
        $this->assertTrue($rule->is_active);
        $this->assertSame(['bell'], $rule->channels);
        $this->assertDatabaseCount('notification_rules', 1);
    }

    public function test_digest_command_skips_org_with_digest_disabled(): void
    {
        $organization = $this->createOrganization();
        $organization->update(['settings' => ['notification_settings' => ['daily_digest' => false]]]);
        $admin = $this->createUser($organization, 'admin');

        SystemNotification::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'type' => 'leave_request',
            'title' => 'Leave',
            'message' => 'Pending',
            'is_read' => false,
        ]);

        $exit = $this->artisan('notifications:digest');

        $this->assertDatabaseMissing('notifications', ['user_id' => $admin->id, 'type' => 'daily_digest']);
    }

    public function test_digest_command_sends_summary_to_users_with_unread(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');

        SystemNotification::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'type' => 'leave_request',
            'title' => 'Leave',
            'message' => 'Pending',
            'is_read' => false,
        ]);

        $this->artisan('notifications:digest')->assertExitCode(0);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => 'daily_digest',
        ]);

        $digest = SystemNotification::query()
            ->where('user_id', $admin->id)
            ->where('type', 'daily_digest')
            ->first();

        $this->assertNotNull($digest);
        $this->assertStringContainsString('Leave Request', $digest->message);
    }

    public function test_notification_recent_endpoint_returns_json_payload(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');

        SystemNotification::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
            'type' => 'fee_concession',
            'title' => 'Fee approved',
            'message' => 'Concession granted',
            'is_read' => false,
        ]);

        $response = $this->actingAs($admin)->getJson('/notifications/recent');

        $response->assertOk()
            ->assertJsonPath('items.0.title', 'Fee approved')
            ->assertJsonPath('unread', 1);
    }

    public function test_notification_rules_crud(): void
    {
        $organization = $this->createOrganization();
        $admin = $this->createUser($organization, 'admin');

        $response = $this->actingAs($admin)->postJson('/settings/notification-rules', [
            'event_type' => 'leave_request',
            'label' => 'Leaves',
            'channels' => ['bell', 'email'],
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('notification_rules', [
            'organization_id' => $organization->id,
            'event_type' => 'leave_request',
            'label' => 'Leaves',
        ]);

        $rule = NotificationRule::query()->where('organization_id', $organization->id)->where('event_type', 'leave_request')->first();

        $toggleResponse = $this->actingAs($admin)->postJson("/settings/notification-rules/{$rule->id}/toggle", [
            'is_active' => false,
        ]);
        $toggleResponse->assertRedirect();

        $this->assertDatabaseHas('notification_rules', [
            'id' => $rule->id,
            'is_active' => false,
        ]);

        $deleteResponse = $this->actingAs($admin)->deleteJson("/settings/notification-rules/{$rule->id}");
        $deleteResponse->assertRedirect();
        $this->assertDatabaseMissing('notification_rules', ['id' => $rule->id]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school-'.uniqid(),
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
}