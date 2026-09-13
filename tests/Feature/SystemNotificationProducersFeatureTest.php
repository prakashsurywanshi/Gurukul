<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Student;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemNotificationProducersFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_lead_notifies_all_org_admins(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $coAdmin = $this->createUser($organization, 'admin');
        $this->createUser($organization, 'teacher');

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Arjun',
                'phone' => '9876543210',
                'source' => 'walkin',
                'status' => 'new',
                'priority' => 'low',
                'interested_class' => 'Grade 5',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $notification = SystemNotification::query()->where('user_id', $coAdmin->id)->firstOrFail();

        $this->assertSame('lead', $notification->type);
        $this->assertSame('New Lead', $notification->title);
        $this->assertStringContainsString('Arjun', $notification->message);
        $this->assertStringContainsString('Grade 5', $notification->message);
        $this->assertSame('/leads', $notification->data['action_url']);
        $this->assertSame('lead_created', $notification->data['event']);

        $this->assertCount(2, SystemNotification::query()->whereIn('user_id', [$admin->id, $coAdmin->id])->get());
        $this->assertSame(2, SystemNotification::query()->where('organization_id', $organization->id)->count());
    }

    public function test_new_admission_enquiry_notifies_org_admins(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $staff = $this->createUser($organization, 'receptionist');
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($staff)
            ->post('/admission-enquiry', [
                'full_name' => 'Sneha',
                'guardian_name' => 'Ramesh',
                'email' => 'sneha@example.com',
                'phone' => '9876500000',
                'class_interested' => 'Grade 2',
                'enquiry_date' => now()->format('Y-m-d'),
                'source' => 'walk_in',
                'status' => 'pending',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $notification = SystemNotification::query()->where('user_id', $admin->id)->firstOrFail();

        $this->assertSame('admission_enquiry', $notification->type);
        $this->assertSame('New Admission Enquiry', $notification->title);
        $this->assertStringContainsString('Sneha', $notification->message);
        $this->assertStringContainsString('Grade 2', $notification->message);
        $this->assertSame('/admission-enquiry', $notification->data['action_url']);
        $this->assertSame('admission_enquiry_created', $notification->data['event']);
    }

    public function test_new_staff_complaint_notifies_org_admins(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $coAdmin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/complains', [
                'complainant_name' => 'Rohit',
                'phone' => '9876400000',
                'source' => 'other',
                'category' => 'Food Quality',
                'complaint_date' => now()->format('Y-m-d'),
                'status' => 'open',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $notification = SystemNotification::query()->where('user_id', $coAdmin->id)->firstOrFail();

        $this->assertSame('complaint', $notification->type);
        $this->assertSame('New Complaint', $notification->title);
        $this->assertStringContainsString('Rohit', $notification->message);
        $this->assertStringContainsString('Food Quality', $notification->message);
        $this->assertSame('/complains', $notification->data['action_url']);
        $this->assertSame('complaint_created', $notification->data['event']);
    }

    public function test_student_complaint_notifies_org_admins(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $studentUser = $this->createUser($organization, 'student');
        $admin = $this->createUser($organization, 'admin');

        Student::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $studentUser->id,
            'admission_no' => 'ADM-9001',
            'first_name' => 'Meera',
            'last_name' => 'Nair',
            'date_of_birth' => '2013-02-10',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($studentUser)
            ->post('/complains', [
                'phone' => '',
                'category' => 'Hostel Food',
                'complaint_date' => now()->format('Y-m-d'),
                'note' => 'Dinner was served late.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $notification = SystemNotification::query()->where('user_id', $admin->id)->firstOrFail();

        $this->assertSame('complaint', $notification->type);
        $this->assertSame('New Complaint', $notification->title);
        $this->assertStringContainsString('Meera Nair', $notification->message);
        $this->assertStringContainsString('Hostel Food', $notification->message);
    }

    public function test_push_notifications_disabled_skips_bell_notifications(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'notification_settings' => [
                    'push_notifications' => false,
                    'email_alerts' => true,
                    'sms_alerts' => false,
                    'daily_digest' => true,
                    'event_reminders' => true,
                    'fee_due_reminders' => true,
                    'attendance_alerts' => true,
                ],
            ],
        ]);

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Arjun',
                'phone' => '9876543210',
                'source' => 'walkin',
                'status' => 'new',
                'priority' => 'low',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(0, SystemNotification::query()->where('organization_id', $organization->id)->count());

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'notification_settings' => [
                    ...($organization->settings['notification_settings'] ?? []),
                    'push_notifications' => true,
                ],
            ],
        ]);

        $this->actingAs($admin)
            ->post('/leads', [
                'student_name' => 'Kavya',
                'phone' => '9876543211',
                'source' => 'walkin',
                'status' => 'new',
                'priority' => 'high',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(1, SystemNotification::query()->where('organization_id', $organization->id)->count());
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
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
            'settings' => [],
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }
}