<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\CctvAccessLog;
use App\Models\CctvCamera;
use App\Models\CompliancePack;
use App\Models\Organization;
use App\Models\QrScanLog;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComplianceCctvTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'UTC']);
        date_default_timezone_set('UTC');
    }

    public function test_admin_can_manage_compliance_packs_and_items(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/compliance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Compliance')
                ->has('packs', 0)
                ->where('summary.packs', 0)
                ->where('summary.completion', 0)
            );

        $this->actingAs($admin)->post('/compliance/packs', [
            'name' => 'CBSE Affiliation Requirements',
            'category' => 'CBSE',
            'description' => 'Annual compliance',
            'status' => 'active',
        ])->assertRedirect();

        $pack = CompliancePack::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($pack);
        $this->assertSame('CBSE', $pack->category);

        $this->actingAs($admin)->post("/compliance/packs/{$pack->id}/items", [
            'compliance_pack_id' => $pack->id,
            'title' => 'Renew school recognition certificate',
            'frequency' => 'yearly',
            'due_date' => now()->addMonths(2)->toDateString(),
        ])->assertRedirect();

        $this->assertSame(1, $pack->items->count());

        $item = $pack->items()->first();

        $this->actingAs($admin)->put("/compliance/items/{$item->id}", ['status' => 'compliant'])->assertRedirect();
        $this->assertSame('compliant', $item->fresh()->status);
        $this->assertNotNull($item->fresh()->verified_at);

        $this->actingAs($admin)
            ->get('/compliance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('packs', 1)
                ->where('packs.0.itemCount', 1)
                ->where('packs.0.compliantCount', 1)
                ->where('items.0.status', 'compliant')
                ->where('summary.compliant', 1)
                ->where('summary.completion', 100)
            );

        $this->actingAs($admin)->put("/compliance/items/{$item->id}", ['status' => 'pending'])->assertRedirect();
        $this->assertNull($item->fresh()->verified_at);

        $this->actingAs($admin)->delete("/compliance/items/{$item->id}")->assertRedirect();
        $this->assertNull($item->fresh());

        $this->actingAs($admin)->delete("/compliance/packs/{$pack->id}")->assertRedirect();
        $this->assertNull($pack->fresh());
    }

    public function test_compliance_item_in_other_organization_returns_404(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);
        app(StaffPermissionService::class)->ensureRolesExist($organizationB);
        $adminA = $this->createUser($organizationA, 'admin');
        $adminB = $this->createUser($organizationB, 'admin');

        $pack = CompliancePack::query()->create([
            'organization_id' => $organizationB->id,
            'name' => 'Private Pack',
            'category' => 'Other',
            'status' => 'active',
        ]);

        $this->actingAs($adminA)->post("/compliance/packs/{$pack->id}/items", [
            'compliance_pack_id' => $pack->id,
            'title' => 'Nope',
            'frequency' => 'once',
        ])->assertSessionHasErrors('compliance_pack_id');

        $this->actingAs($adminA)
            ->get('/compliance')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('packs', 0));
    }

    public function test_compliance_rejects_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)->get('/compliance')->assertForbidden();
    }

    public function test_admin_can_register_cctv_cameras_and_log_access(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/cctv')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Cctv')
                ->has('cameras', 0)
                ->where('summary.cameras', 0)
            );

        $this->actingAs($admin)->post('/cctv', [
            'name' => 'Main Gate Camera',
            'location' => 'Main Gate',
            'camera_type' => 'gate',
        ])->assertRedirect();

        $camera = CctvCamera::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($camera);
        $this->assertSame('gate', $camera->camera_type);
        $this->assertTrue($camera->is_active);
        $this->assertSame(1, CctvAccessLog::query()->where('cctv_camera_id', $camera->id)->where('action', 'camera_added')->count());

        $this->actingAs($admin)->post("/cctv/{$camera->id}/access", ['action' => 'view'])->assertRedirect();
        $this->actingAs($admin)->post("/cctv/{$camera->id}/access", ['action' => 'export'])->assertRedirect();

        $this->assertSame(2, CctvAccessLog::query()->where('cctv_camera_id', $camera->id)->whereIn('action', ['view', 'export'])->count());

        $this->actingAs($admin)
            ->get('/cctv')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('cameras', 1)
                ->where('cameras.0.isActive', true)
                ->where('cameras.0.accessCount', 3)
                ->where('logs.0.cameraName', 'Main Gate Camera')
                ->where('summary.active', 1)
                ->where('summary.views', 1)
                ->where('summary.exports', 1)
            );

        $this->actingAs($admin)->post("/cctv/{$camera->id}/toggle")->assertRedirect();
        $this->assertFalse($camera->fresh()->is_active);

        $this->actingAs($admin)->delete("/cctv/{$camera->id}")->assertRedirect();
        $this->assertNull($camera->fresh());
    }

    public function test_cctv_scopes_cameras_to_organization(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);
        app(StaffPermissionService::class)->ensureRolesExist($organizationB);
        $adminA = $this->createUser($organizationA, 'admin');

        $cameraB = CctvCamera::query()->create([
            'organization_id' => $organizationB->id,
            'name' => 'Other School Camera',
            'camera_type' => 'corridor',
            'is_active' => true,
        ]);

        $this->actingAs($adminA)->post("/cctv/{$cameraB->id}/toggle")->assertNotFound();
        $this->actingAs($adminA)->delete("/cctv/{$cameraB->id}")->assertNotFound();

        $this->actingAs($adminA)
            ->get('/cctv')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('cameras', 0));
    }

    public function test_cctv_rejects_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $accountant = $this->createUser($organization, 'accountant');

        $this->actingAs($accountant)->get('/cctv')->assertForbidden();
    }

    public function test_admin_can_view_regulator_reports(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $schoolClass = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '5',
            'section' => 'A',
            'status' => 'active',
        ]);

        $this->createUser($organization, 'teacher');

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $schoolClass->id,
            'admission_no' => 'ADM-'.$organization->id,
            'first_name' => 'Roshan',
            'last_name' => 'Patil',
            'date_of_birth' => '2014-05-10',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ]);

        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $schoolClass->id,
            'date' => now()->toDateString(),
            'status' => 'present',
            'marked_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get('/regulator-reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/RegulatorReports')
                ->where('school.name', $organization->name)
                ->where('disclosure.studentCount', 1)
                ->where('disclosure.staffCount', 2)
                ->where('disclosure.classCount', 1)
                ->where('disclosure.studentGender.0.label', 'Male')
                ->where('disclosure.studentGender.0.count', 1)
                ->where('disclosure.classDistribution.0.name', '5 - A')
                ->where('government.markedToday', 1)
                ->where('government.presentToday', 1)
                ->where('government.attendanceRate', 100)
            );

        $teacher = $this->createUser($organization, 'teacher');
        $this->actingAs($teacher)->get('/regulator-reports')->assertForbidden();
    }

    public function test_qr_attendance_post_writes_scan_logs_and_audit_shows_counts(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $year = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => now()->year.'-'.(now()->year + 1),
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
        ]);

        $schoolClass = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => '8',
            'section' => 'B',
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $schoolClass->id,
            'admission_no' => 'QR-ADM-'.$organization->id,
            'first_name' => 'Ishita',
            'last_name' => 'Nair',
            'date_of_birth' => '2012-03-15',
            'gender' => 'female',
            'qr_token' => 'QR-'.$organization->id.'-SCAN-TOKEN',
            'admission_date' => now()->toDateString(),
        ]);

        $date = now()->toDateString();

        $this->actingAs($admin)->post('/attendance-qr', [
            'class_id' => $schoolClass->id,
            'date' => $date,
            'entries' => [
                ['student_id' => $student->id, 'status' => 'present'],
            ],
        ])->assertRedirect();

        $this->assertSame(1, Attendance::query()->where('student_id', $student->id)->whereDate('date', $date)->count());
        $this->assertSame('present', Attendance::query()->where('student_id', $student->id)->whereDate('date', $date)->value('status'));

        $scanLog = QrScanLog::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($scanLog);
        $this->assertSame($student->id, $scanLog->student_id);
        $this->assertSame($admin->id, $scanLog->scanned_by);
        $this->assertSame('success', $scanLog->status);
        $this->assertSame('QR-'.$organization->id.'-SCAN-TOKEN', $scanLog->qr_token);
        $this->assertSame($date, $scanLog->scan_date->toDateString());

        $this->actingAs($admin)
            ->get('/qr-scan-audit')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/QrScanAudit')
                ->where('summary.scansToday', 1)
                ->where('summary.successToday', 1)
                ->where('summary.attendanceMarked', 1)
                ->where('summary.totalScans', 1)
                ->where('summary.successRate', 100)
                ->where('logs.0.studentName', 'Ishita Nair')
                ->where('logs.0.status', 'success')
            );
    }

    public function test_qr_scan_audit_rejects_non_admin(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createUser($organization, 'teacher');

        $this->actingAs($teacher)->get('/qr-scan-audit')->assertForbidden();
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Compliance Test School '.$counter,
            'slug' => 'compliance-test-school-'.$counter,
            'email' => 'compliance-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}