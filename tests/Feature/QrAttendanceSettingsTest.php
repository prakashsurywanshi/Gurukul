<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrAttendanceSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_loads_with_defaults(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/qr-attendance/settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/QrAttendanceSettings')
                ->where('settings.enabled', true)
                ->where('settings.duplicate_upsert', false)
                ->where('settings.auto_late_mark', false)
                ->where('settings.opening_time', '08:30')
                ->where('settings.late_after_minutes', 15)
            );
    }

    public function test_save_settings_persists_and_returns_values(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $payload = [
            'enabled' => false,
            'duplicate_upsert' => true,
            'auto_late_mark' => true,
            'opening_time' => '09:15',
            'late_after_minutes' => 25,
        ];

        $this->actingAs($admin)
            ->post('/qr-attendance/settings', $payload)
            ->assertRedirect();

        $organization->refresh();
        $qrSettings = $organization->settings['qr_attendance'] ?? null;

        $this->assertNotNull($qrSettings);
        $this->assertFalse($qrSettings['enabled']);
        $this->assertTrue($qrSettings['duplicate_upsert']);
        $this->assertTrue($qrSettings['auto_late_mark']);
        $this->assertEquals('09:15', $qrSettings['opening_time']);
        $this->assertEquals(25, $qrSettings['late_after_minutes']);

        $this->actingAs($admin)
            ->get('/qr-attendance/settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('settings.enabled', false)
                ->where('settings.duplicate_upsert', true)
                ->where('settings.opening_time', '09:15')
            );
    }

    public function test_save_settings_validation_rejects_bad_time(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/qr-attendance/settings', [
                'enabled' => true,
                'duplicate_upsert' => false,
                'auto_late_mark' => false,
                'opening_time' => '99:99',
                'late_after_minutes' => 15,
            ])
            ->assertSessionHasErrors('opening_time');
    }

    public function test_save_settings_validation_rejects_bad_minutes(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/qr-attendance/settings', [
                'enabled' => true,
                'duplicate_upsert' => false,
                'auto_late_mark' => false,
                'opening_time' => '08:30',
                'late_after_minutes' => 300,
            ])
            ->assertSessionHasErrors('late_after_minutes');
    }

    public function test_driver_cannot_access_settings(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)->get('/qr-attendance/settings')->assertForbidden();

        $this->actingAs($driver)
            ->post('/qr-attendance/settings', [
                'enabled' => true,
                'duplicate_upsert' => false,
                'auto_late_mark' => false,
                'opening_time' => '08:30',
                'late_after_minutes' => 15,
            ])
            ->assertForbidden();
    }

    public function test_duplicate_scan_keeps_first_status_when_duplicate_upsert_disabled(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $class = $this->createClassWithStudent($organization);

        $date = now()->toDateString();

        $this->actingAs($admin)->post('/attendance-qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [['student_id' => $class->student->id, 'status' => 'present']],
        ])->assertRedirect();

        $this->actingAs($admin)->post('/attendance-qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [['student_id' => $class->student->id, 'status' => 'absent']],
        ])->assertRedirect();

        $record = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $class->student->id)
            ->whereDate('date', $date)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('present', $record->status);
    }

    public function test_duplicate_scan_updates_status_when_duplicate_upsert_enabled(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $class = $this->createClassWithStudent($organization);

        $this->actingAs($admin)->post('/qr-attendance/settings', [
            'enabled' => true,
            'duplicate_upsert' => true,
            'auto_late_mark' => false,
            'opening_time' => '08:30',
            'late_after_minutes' => 15,
        ])->assertRedirect();

        $date = now()->toDateString();

        $this->actingAs($admin)->post('/attendance-qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [['student_id' => $class->student->id, 'status' => 'present']],
        ])->assertRedirect();

        $this->actingAs($admin)->post('/attendance-qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [['student_id' => $class->student->id, 'status' => 'absent']],
        ])->assertRedirect();

        $record = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $class->student->id)
            ->whereDate('date', $date)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('absent', $record->status);
    }

    public function test_auto_late_mark_converts_present_to_late(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $class = $this->createClassWithStudent($organization);

        $this->actingAs($admin)->post('/qr-attendance/settings', [
            'enabled' => true,
            'duplicate_upsert' => false,
            'auto_late_mark' => true,
            'opening_time' => '00:00',
            'late_after_minutes' => 0,
        ])->assertRedirect();

        $date = now()->toDateString();

        $this->actingAs($admin)->post('/attendance-qr', [
            'class_id' => $class->id,
            'date' => $date,
            'entries' => [['student_id' => $class->student->id, 'status' => 'present']],
        ])->assertRedirect();

        $record = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $class->student->id)
            ->whereDate('date', $date)
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('late', $record->status);
    }

    private function createClassWithStudent(Organization $organization): SchoolClass
    {
        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '6',
            'section' => 'A',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'admission_no' => 'QR-SET-'.$organization->id,
            'first_name' => 'Kabir',
            'last_name' => 'Singh',
            'date_of_birth' => '2013-05-10',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        $class->student = $student;

        return $class;
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'QR Settings School '.$counter,
            'slug' => 'qr-settings-school-'.$counter,
            'email' => 'qr-settings-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' Settings User',
            'email' => $role.'-qr-settings-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}