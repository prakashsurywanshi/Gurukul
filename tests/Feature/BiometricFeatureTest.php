<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BiometricFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_requires_permission(): void
    {
        $owner = User::factory()->create(['role' => 'owner', 'organization_id' => $this->organization()->id]);

        $this->actingAs($owner)->get('/settings/biometric')->assertForbidden();
    }

    public function test_admin_sees_settings_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $this->organization()->id]);

        $this->actingAs($admin)->get('/settings/biometric')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/BiometricSettings'));
    }

    public function test_admin_regenerates_key_stored_per_organization(): void
    {
        $org = $this->organization();
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $this->actingAs($admin)->post('/settings/biometric/regenerate')->assertRedirect();

        $org->refresh();
        $this->assertNotEmpty($org->settings['biometric']['sync_key'] ?? '');
        $this->assertSame(32, strlen((string) ($org->settings['biometric']['sync_key'] ?? '')));
    }

    public function test_reveal_returns_key(): void
    {
        $org = $this->organization();
        $org->settings = array_replace_recursive($org->settings ?? [], ['biometric' => ['sync_key' => 'secret-key-abc']]);
        $org->save();
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $this->actingAs($admin)->getJson('/settings/biometric/reveal')
            ->assertOk()
            ->assertJsonPath('key', 'secret-key-abc');
    }

    public function test_status_public_when_no_key_configured(): void
    {
        $this->getJson('/api/biometric/status')->assertOk()->assertJsonPath('configured', false);
    }

    public function test_attendance_rejected_without_key_when_unconfigured(): void
    {
        $this->postJson('/api/biometric/attendance', ['admission_no' => 'X', 'datetime' => now()])
            ->assertStatus(503);
    }

    public function test_attendance_rejected_with_invalid_key_when_configured(): void
    {
        $this->organization()->update(['settings' => ['biometric' => ['sync_key' => 'org-key-123']]]);

        $this->postJson('/api/biometric/attendance', ['admission_no' => 'X', 'datetime' => now()])
            ->assertStatus(401);
    }

    public function test_attendance_synced_with_org_key_and_scoped_to_org(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['biometric' => ['sync_key' => 'org-key-123']]]);

        $other = Organization::create($this->organizationFields('Org B', 'org-b'));
        User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $student = $this->seedStudent($org, 'ADM-1');

        $this->postJson('/api/biometric/attendance', [
            'admission_no' => 'ADM-1',
            'datetime' => '2026-09-09 08:45:00',
            'direction' => 'in',
        ], ['X-Biometric-Key' => 'org-key-123'])
            ->assertOk()
            ->assertJsonPath('student_id', (string) $student->id);

        $this->assertDatabaseHas('attendance', [
            'student_id' => $student->id,
            'organization_id' => $org->id,
            'status' => 'present',
            'check_in_time' => '08:45:00',
            'date' => '2026-09-09 00:00:00',
        ]);
        $this->assertDatabaseCount('attendance', 1);
    }

    private function organization(): Organization
    {
        if ($org = Organization::first()) {
            return $org;
        }

        return Organization::create($this->organizationFields('Preview School', 'preview-school'));
    }

    private function organizationFields(string $name, string $slug): array
    {
        return [
            'name' => $name,
            'slug' => $slug,
            'email' => $slug . '@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ];
    }

    private function seedStudent(Organization $organization, string $admissionNo): Student
    {
        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'name' => '10',
            'section' => 'A',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $id = DB::table('students')->insertGetId([
            'organization_id' => $organization->id,
            'first_name' => 'Test',
            'last_name' => 'Student',
            'email' => $admissionNo . '@student.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => $admissionNo,
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organization->id,
            'student_id' => $id,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Student::query()->findOrFail($id);
    }
}