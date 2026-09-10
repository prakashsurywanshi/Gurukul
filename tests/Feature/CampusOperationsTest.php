<?php

namespace Tests\Feature;

use App\Models\CampusWorker;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Facility;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampusOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_facilities_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        Facility::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Science Lab',
            'facility_type' => 'laboratory',
            'capacity' => 40,
            'location' => 'Block A',
        ]);

        $this->actingAs($admin)
            ->get('/facilities')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Facilities')
                ->has('facilities', 1)
                ->where('facilities.0.name', 'Science Lab')
                ->where('facilities.0.facility_type', 'laboratory')
                ->where('facilities.0.capacity', 40)
            );
    }

    public function test_admin_can_add_update_and_delete_facility(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/facilities', [
                'name' => 'Library',
                'facility_type' => 'library',
                'capacity' => 200,
                'location' => 'Main Building',
                'status' => 'active',
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $facility = Facility::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($facility);
        $this->assertSame('library', $facility->facility_type);

        $this->actingAs($admin)
            ->put("/facilities/{$facility->id}", [
                'name' => 'Central Library',
                'facility_type' => 'library',
                'capacity' => 180,
                'location' => 'Block B',
                'status' => 'active',
                'sort_order' => 2,
            ])
            ->assertRedirect();

        $this->assertSame('Central Library', $facility->fresh()->name);

        $this->actingAs($admin)->delete("/facilities/{$facility->id}")->assertRedirect();
        $this->assertNull(Facility::find($facility->id));
    }

    public function test_facility_name_must_be_unique_per_organization(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        Facility::query()->create(['organization_id' => $organization->id, 'name' => 'Science Lab', 'facility_type' => 'laboratory']);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/facilities', ['name' => 'Science Lab', 'facility_type' => 'classroom', 'status' => 'active'])
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_view_campus_workers_with_departments(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $department = Department::query()->create(['organization_id' => $organization->id, 'name' => 'Administration']);
        CampusWorker::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Ramesh Kumar',
            'worker_type' => 'peon',
            'department_id' => $department->id,
            'shift' => 'Morning',
        ]);

        $this->actingAs($admin)
            ->get('/campus-workers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CampusWorkers')
                ->has('workers', 1)
                ->where('workers.0.name', 'Ramesh Kumar')
                ->where('workers.0.departmentName', 'Administration')
                ->has('departmentOptions', 1)
            );
    }

    public function test_admin_can_add_update_and_delete_campus_worker(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $department = Department::query()->create(['organization_id' => $organization->id, 'name' => 'Gardening']);

        $this->actingAs($admin)
            ->post('/campus-workers', [
                'name' => 'Suresh Patil',
                'worker_type' => 'gardener',
                'department_id' => $department->id,
                'phone' => '9876543210',
                'shift' => 'Morning',
                'status' => 'active',
            ])
            ->assertRedirect();

        $worker = CampusWorker::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($worker);
        $this->assertSame($department->id, $worker->department_id);

        $this->actingAs($admin)
            ->put("/campus-workers/{$worker->id}", [
                'name' => 'Suresh Patil',
                'worker_type' => 'gardener',
                'department_id' => null,
                'phone' => '9876500000',
                'status' => 'inactive',
            ])
            ->assertRedirect();

        $fresh = $worker->fresh();
        $this->assertSame('9876500000', $fresh->phone);
        $this->assertNull($fresh->department_id);
        $this->assertSame('inactive', $fresh->status);

        $this->actingAs($admin)->delete("/campus-workers/{$worker->id}")->assertRedirect();
        $this->assertNull(CampusWorker::find($worker->id));
    }

    public function test_staff_directory_lists_active_staff_and_filters(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $admin->forceFill(['name' => 'Amrish Patel'])->save();
        $department = Department::query()->create(['organization_id' => $organization->id, 'name' => 'Science']);
        $designation = Designation::query()->create(['organization_id' => $organization->id, 'name' => 'PGT']);

        User::factory()->create([
            'organization_id' => $organization->id,
            'name' => 'Meena Sharma',
            'role' => 'teacher',
            'employee_id' => 'EMP-001',
            'department_id' => $department->id,
            'designation_id' => $designation->id,
            'phone' => '9876540001',
            'joining_date' => '2024-06-01',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get('/staff-directory')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/StaffDirectory')
                ->has('staff', 2)
                ->where('staff.1.name', 'Meena Sharma')
                ->where('staff.1.department', 'Science')
                ->where('staff.1.designation', 'PGT')
                ->where('staff.1.roleLabel', 'Teacher')
                ->where('summary.teachers', 1)
            );

        $this->actingAs($admin)
            ->get('/staff-directory?search=Meena')
            ->assertInertia(fn ($page) => $page->has('staff', 1));

        $this->actingAs($admin)
            ->get('/staff-directory?search=Nonexistent')
            ->assertInertia(fn ($page) => $page->has('staff', 0));

        $this->actingAs($admin)
            ->get('/staff-directory?department_id='.$department->id)
            ->assertInertia(fn ($page) => $page->has('staff', 1));
    }

    public function test_staff_directory_filters_by_role_and_excludes_inactive(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        User::factory()->create(['organization_id' => $organization->id, 'name' => 'Active Teacher', 'role' => 'teacher', 'status' => 'active']);
        User::factory()->create(['organization_id' => $organization->id, 'name' => 'Inactive Teacher', 'role' => 'teacher', 'status' => 'inactive']);
        User::factory()->create(['organization_id' => $organization->id, 'name' => 'Librarian Person', 'role' => 'librarian', 'status' => 'active']);

        $this->actingAs($admin)
            ->get('/staff-directory')
            ->assertInertia(fn ($page) => $page->has('staff', 3));

        $this->actingAs($admin)
            ->get('/staff-directory?role=librarian')
            ->assertInertia(fn ($page) => $page->has('staff', 1)->where('staff.0.roleLabel', 'Librarian'));

        $this->actingAs($admin)
            ->get('/staff-directory?status=inactive')
            ->assertInertia(fn ($page) => $page->has('staff', 1));
    }

    public function test_cross_organization_facility_returns_404(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $facility = Facility::query()->create(['organization_id' => $organization->id, 'name' => 'Lab', 'facility_type' => 'laboratory']);
        $otherAdmin = $this->createUser($other, 'admin');

        $this->actingAs($otherAdmin)
            ->put("/facilities/{$facility->id}", ['name' => 'X', 'facility_type' => 'classroom', 'status' => 'active'])
            ->assertNotFound();
    }

    public function test_receptionist_blocked_from_facility_writes(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->post('/facilities', ['name' => 'Lab', 'facility_type' => 'laboratory', 'status' => 'active'])
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