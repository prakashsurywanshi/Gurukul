<?php

namespace Tests\Feature;

use App\Models\LibraryBook;
use App\Models\Organization;
use App\Models\TransportVehicle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuildSurfacesTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    private User $librarian;

    protected function setUp(): void
    {
        parent::setUp();
        $this->organization = Organization::query()->create([
            'name' => 'Build Surfaces Test School',
            'slug' => 'build-surfaces-test-school',
            'email' => 'build-surfaces-test@example.com',
        ]);
        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'admin',
        ]);
        $this->librarian = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'librarian',
        ]);
    }

    public function test_admin_can_view_card_designs(): void
    {
        $this->actingAs($this->admin)
            ->get('/id-cards/designs')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CardDesigns')
                ->has('design', 8)
                ->where('design.layout', 'landscape'));
    }

    public function test_admin_can_save_card_design(): void
    {
        $this->actingAs($this->admin)
            ->patch('/id-cards/designs', [
                'layout' => 'portrait',
                'primary_color' => '#b91c1c',
                'show_photo' => true,
                'show_admission_no' => true,
                'show_qr' => false,
                'show_guardian' => false,
                'show_blood_group' => true,
                'show_dob' => true,
            ])
            ->assertRedirect(route('card-designs'));

        $this->assertSame('portrait', $this->organization->refresh()->settings['id_card_design']['layout']);
        $this->assertSame('#b91c1c', $this->organization->refresh()->settings['id_card_design']['primary_color']);
        $this->assertFalse($this->organization->refresh()->settings['id_card_design']['show_qr']);
    }

    public function test_card_design_rejects_non_admin(): void
    {
        $this->actingAs($this->librarian)
            ->get('/id-cards/designs')
            ->assertForbidden();
    }

    public function test_admin_can_view_and_save_live_class_settings(): void
    {
        $this->actingAs($this->admin)
            ->get('/live-classes/settings')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/LiveClassSettings')
                ->where('settings.max_participants', '100'));

        $this->actingAs($this->admin)
            ->patch('/live-classes/settings', [
                'default_platform' => 'zoom',
                'max_participants' => '50',
                'auto_record' => false,
                'allow_chat' => true,
                'send_join_notifications' => true,
                'require_approval' => true,
            ])
            ->assertRedirect(route('live-classes.settings'));

        $settings = $this->organization->refresh()->settings['live_class_settings'];
        $this->assertSame('zoom', $settings['default_platform']);
        $this->assertSame('50', $settings['max_participants']);
        $this->assertTrue($settings['require_approval']);
        $this->assertFalse($settings['auto_record']);
    }

    public function test_admin_can_view_and_save_notification_settings(): void
    {
        $this->actingAs($this->admin)
            ->get('/settings/notification')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/NotificationSettings')
                ->where('settings.email_alerts', true));

        $this->actingAs($this->admin)
            ->patch('/settings/notification', [
                'email_alerts' => false,
                'push_notifications' => true,
                'sms_alerts' => true,
                'daily_digest' => false,
                'event_reminders' => true,
                'fee_due_reminders' => true,
                'attendance_alerts' => false,
            ])
            ->assertRedirect(route('notification-settings'));

        $settings = $this->organization->refresh()->settings['notification_settings'];
        $this->assertFalse($settings['email_alerts']);
        $this->assertTrue($settings['sms_alerts']);
        $this->assertFalse($settings['attendance_alerts']);
    }

    public function test_notification_settings_rejects_non_admin(): void
    {
        $this->actingAs($this->librarian)
            ->get('/settings/notification')
            ->assertForbidden();
    }

    public function test_librarian_can_view_book_categories(): void
    {
        LibraryBook::query()->create([
            'organization_id' => $this->organization->id,
            'title' => 'Science Reader',
            'book_number' => 'SCI-001',
            'author' => 'Author A',
            'category' => 'Science',
            'isbn' => 'X1',
            'available_copies' => 3,
            'total_copies' => 3,
            'status' => 'active',
        ]);
        LibraryBook::query()->create([
            'organization_id' => $this->organization->id,
            'title' => 'Math Workbook',
            'book_number' => 'MATH-001',
            'author' => 'Author B',
            'category' => 'Mathematics',
            'isbn' => 'X2',
            'available_copies' => 1,
            'total_copies' => 1,
            'status' => 'active',
        ]);

        $this->actingAs($this->librarian)
            ->get('/library/categories')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/BookCategories')
                ->where('totalBooks', 2)
                ->has('categories', 2));
    }

    public function test_admin_can_view_book_categories_for_own_org_only(): void
    {
        $other = Organization::query()->create([
            'name' => 'Other School',
            'slug' => 'other-school',
            'email' => 'other@example.com',
        ]);
        LibraryBook::query()->create([
            'organization_id' => $other->id,
            'title' => 'Foreign Book',
            'book_number' => 'OTH-001',
            'author' => 'Author C',
            'category' => 'History',
            'isbn' => 'X3',
            'available_copies' => 1,
            'total_copies' => 1,
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)
            ->get('/library/categories')
            ->assertInertia(fn ($page) => $page
                ->where('totalBooks', 0)
                ->has('categories', 0));
    }

    public function test_admin_can_view_drivers_derived_from_vehicles(): void
    {
        TransportVehicle::query()->create([
            'organization_id' => $this->organization->id,
            'vehicle_number' => 'MH-12-AB-1234',
            'vehicle_type' => 'bus',
            'driver_name' => 'Ramesh Kumar',
            'driver_phone' => '9876543210',
            'driver_license' => 'DL-2020-4412',
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)
            ->get('/transport/drivers')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/TransportDrivers')
                ->where('total', 1)
                ->where('drivers.0.name', 'Ramesh Kumar')
                ->where('drivers.0.license', 'DL-2020-4412'));
    }

    public function test_drivers_view_requires_admin(): void
    {
        $this->actingAs($this->librarian)
            ->get('/transport/drivers')
            ->assertForbidden();
    }
}