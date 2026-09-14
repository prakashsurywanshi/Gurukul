<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Semester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CollegeModeFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(string $orgType = 'college', string $suffix = 'college'): array
    {
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => 'Career College',
            'slug' => "college-{$suffix}",
            'email' => "admin@{$suffix}.test",
            'phone' => '5550001234',
            'address' => 'College Road',
            'status' => 'active',
            'type' => $orgType,
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'College Admin',
            'email' => "principal@{$suffix}.test",
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organizationId,
            'name' => '2026-2027',
            'start_date' => '2026-06-01',
            'end_date' => '2027-04-30',
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$adminId, $organizationId, $academicYearId];
    }

    private function createSemester(int $orgId, int $yearId, int $semNo, string $name, bool $isCurrent = false): int
    {
        return DB::table('semesters')->insertGetId([
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'name' => $name,
            'sem_no' => $semNo,
            'start_date' => "2026-0{$semNo}-01",
            'end_date' => "2027-0{$semNo}-15",
            'is_current' => $isCurrent,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_college_admin_can_open_semester_settings_page(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/semesters')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/SemesterSettings')
                ->where('academicYear.id', $yearId)
                ->where('academicYear.name', '2026-2027')
                ->has('semesters')
                ->where('nextSemNo', 1));
    }

    public function test_admin_can_create_semester(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->post('/semesters', [
                'name' => 'Semester 1',
                'sem_no' => 1,
                'start_date' => '2026-06-01',
                'end_date' => '2026-11-30',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('semesters', [
            'organization_id' => $orgId,
            'academic_year_id' => $yearId,
            'name' => 'Semester 1',
            'sem_no' => 1,
            'is_current' => false,
        ]);
    }

    public function test_semester_validation_rejects_invalid_dates_and_numbers(): void
    {
        [$adminId] = $this->seedContext();

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->from('/semesters')
            ->post('/semesters', [
                'name' => 'Bad Semester',
                'sem_no' => 0,
                'start_date' => '2026-12-01',
                'end_date' => '2026-11-01',
            ])
            ->assertSessionHasErrors(['sem_no', 'end_date']);
    }

    public function test_admin_can_update_semester(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $semesterId = $this->createSemester($orgId, $yearId, 1, 'Semester 1');

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->patch("/semesters/{$semesterId}", [
                'name' => 'Semester I',
                'start_date' => '2026-06-15',
                'end_date' => '2026-11-30',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('semesters', [
            'id' => $semesterId,
            'name' => 'Semester I',
            'start_date' => '2026-06-15 00:00:00',
            'end_date' => '2026-11-30 00:00:00',
        ]);
    }

    public function test_admin_can_set_current_semester(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $firstId = $this->createSemester($orgId, $yearId, 1, 'Semester 1', true);
        $secondId = $this->createSemester($orgId, $yearId, 2, 'Semester 2', false);

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->patch("/semesters/{$secondId}/current", [])
            ->assertRedirect();

        $this->assertDatabaseHas('semesters', ['id' => $secondId, 'is_current' => true]);
        $this->assertDatabaseHas('semesters', ['id' => $firstId, 'is_current' => false]);

        $semester = Semester::query()->find($secondId);
        $this->assertSame($orgId, $semester->organization_id);
        $this->assertSame((int) $yearId, (int) $semester->academic_year_id);
    }

    public function test_organization_resolves_current_semester(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $this->createSemester($orgId, $yearId, 1, 'Semester 1');
        $secondId = $this->createSemester($orgId, $yearId, 2, 'Semester 2', true);

        $this->actingAs(\App\Models\User::query()->find($adminId));

        $organization = Organization::query()->find($orgId);
        $this->assertSame((int) $secondId, (int) $organization->currentSemester()->id);
    }

    public function test_admin_can_delete_semester(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $semesterId = $this->createSemester($orgId, $yearId, 1, 'Semester 1');

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->delete("/semesters/{$semesterId}")
            ->assertRedirect();

        $this->assertDatabaseMissing('semesters', ['id' => $semesterId]);
    }

    public function test_other_organization_admin_cannot_manage_semesters(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext('college', 'one');
        $semesterId = $this->createSemester($orgId, $yearId, 1, 'Semester 1');
        [$otherAdminId, $otherOrgId] = $this->seedContext('college', 'two');

        $other = \App\Models\User::query()->find($otherAdminId);

        $this->actingAs($other)
            ->patch("/semesters/{$semesterId}/current", [])
            ->assertForbidden();

        $this->actingAs($other)
            ->patch("/semesters/{$semesterId}", ['name' => 'Hacked'])
            ->assertForbidden();

        $this->actingAs($other)
            ->delete("/semesters/{$semesterId}")
            ->assertForbidden();

        $this->assertDatabaseHas('semesters', ['id' => $semesterId, 'name' => 'Semester 1', 'is_current' => false]);
        $this->assertNotSame($orgId, $otherOrgId);
    }

    public function test_semesters_are_scoped_to_selected_academic_year(): void
    {
        [$adminId, $orgId, $yearId] = $this->seedContext();

        $this->createSemester($orgId, $yearId, 1, 'Semester 1', true);

        $otherYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $orgId,
            'name' => '2025-2026',
            'start_date' => '2025-06-01',
            'end_date' => '2026-04-30',
            'is_current' => false,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->createSemester($orgId, $otherYearId, 1, 'Old Semester 1');

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/semesters')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('semesters', 1)
                ->where('semesters.0.name', 'Semester 1'));
    }

    public function test_settings_update_persists_organization_type(): void
    {
        [$adminId, $orgId] = $this->seedContext('college');

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->patch('/settings', [
                'name' => 'Career College',
                'email' => 'admin@college.test',
                'phone' => '5550001234',
                'address' => 'College Road',
                'city' => 'Pune',
                'state' => 'MH',
                'pincode' => '411001',
                'website' => null,
                'academicSession' => '2026-2027',
                'dateFormat' => 'DD-MM-YYYY',
                'logo' => null,
                'orgType' => 'university',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('organizations', ['id' => $orgId, 'type' => 'university']);
    }

    public function test_settings_index_exposes_organization_type(): void
    {
        [$adminId, $orgId] = $this->seedContext('college');

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Settings')
                ->where('organization.type', 'college'));
    }

    public function test_org_type_is_shared_to_all_pages(): void
    {
        [$adminId] = $this->seedContext('college');

        $this->actingAs(\App\Models\User::query()->find($adminId))
            ->get('/semesters')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('orgType', 'college'));
    }
}