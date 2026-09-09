<?php

namespace Tests\Feature;

use App\Jobs\ImportStaffJob;
use App\Models\Department;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserImport;
use App\Services\StaffImportService;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImportCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_import_center_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/import-center')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ImportCenter')
                ->has('templates.Students')
                ->has('templates.Staff')
                ->has('roleOptions')
                ->where('recentImports', [])
            );
    }

    public function test_staff_import_is_queued_without_creating_users_during_request(): void
    {
        Queue::fake();
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/import-center/staff', [
                'staff' => [
                    ['name' => 'Rajesh Kumar', 'email' => 'rajesh@gurukul.test', 'role' => 'teacher'],
                ],
            ])
            ->assertRedirect('/import-center');

        $this->assertDatabaseMissing('users', [
            'organization_id' => $organization->id,
            'email' => 'rajesh@gurukul.test',
        ]);

        Queue::assertPushed(
            ImportStaffJob::class,
            fn (ImportStaffJob $job) => $job->userImportId === UserImport::query()->first()?->id
        );

        $this->assertDatabaseHas('user_imports', [
            'organization_id' => $organization->id,
            'requested_by_user_id' => $admin->id,
            'status' => 'queued',
            'submitted_count' => 1,
        ]);

        Storage::disk('local')->assertExists('staff-imports/import-'.UserImport::query()->first()?->id.'.json');
    }

    public function test_staff_import_creates_users_and_links_department(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        Department::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Science',
        ]);

        $result = app(StaffImportService::class)->import([
            [
                'name' => 'Rajesh Kumar',
                'email' => 'rajesh@gurukul.test',
                'phone' => '9876543210',
                'role' => 'teacher',
                'status' => 'active',
                'department' => 'Science',
            ],
            [
                'name' => 'Priya Sharma',
                'email' => 'priya@gurukul.test',
                'role' => 'Accountant',
            ],
            [
                'name' => 'Invalid',
                'email' => 'invalid@gurukul.test',
                'role' => 'Manager',
            ],
            [
                'name' => 'Rajesh Kumar',
                'email' => 'rajesh@gurukul.test',
                'role' => 'teacher',
            ],
        ], $organization);

        $this->assertSame(2, $result['created_count']);
        $this->assertSame(2, $result['error_count']);
        $this->assertStringContainsString('Row 3', $result['errors'][0]);
        $this->assertStringContainsString('Row 4', $result['errors'][1]);

        $this->assertDatabaseHas('users', [
            'organization_id' => $organization->id,
            'email' => 'rajesh@gurukul.test',
            'role' => 'teacher',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        $rajesh = User::query()->where('email', 'rajesh@gurukul.test')->first();
        $this->assertSame('Science', $rajesh->department?->name);

        $this->assertDatabaseHas('users', [
            'organization_id' => $organization->id,
            'email' => 'priya@gurukul.test',
            'role' => 'accountant',
        ]);

        $this->assertDatabaseMissing('users', [
            'organization_id' => $organization->id,
            'email' => 'invalid@gurukul.test',
        ]);
    }

    public function test_admin_can_delete_completed_staff_import(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $import = UserImport::query()->create([
            'organization_id' => $organization->id,
            'requested_by_user_id' => $admin->id,
            'status' => 'completed',
            'queue' => 'imports',
            'submitted_count' => 0,
            'created_count' => 0,
            'skipped_count' => 0,
            'finished_at' => now(),
        ]);

        $this->actingAs($admin)
            ->delete("/import-center/imports/{$import->id}")
            ->assertRedirect('/import-center');

        $this->assertNull(UserImport::query()->find($import->id));
    }

    public function test_receptionist_cannot_import_staff(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->post('/import-center/staff', [
                'staff' => [
                    ['name' => 'Rajesh Kumar', 'email' => 'rajesh@gurukul.test', 'role' => 'teacher'],
                ],
            ])
            ->assertForbidden();
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $slug = 'gurukul-public-school', string $email = 'admin@gurukul.test'): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => $slug,
            'email' => $email,
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