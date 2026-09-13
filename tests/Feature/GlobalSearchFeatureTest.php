<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GlobalSearchFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_is_redirected_to_login(): void
    {
        $this->get('/global-search?q=riya')->assertRedirect('/login');
    }

    public function test_global_search_returns_students_and_staff_for_admin(): void
    {
        $org = $this->seedOrganization();

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Principal Verma',
            'email' => 'principal@school.test',
        ]);

        User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Amit Deshmukh',
            'email' => 'amit@school.test',
        ]);

        $student = Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-1001',
            'first_name' => 'Riya',
            'last_name' => 'Sharma',
            'date_of_birth' => '2013-02-10',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->getJson('/global-search?q=riya')
            ->assertOk()
            ->assertJsonPath('students.0.type', 'student')
            ->assertJsonPath('students.0.name', 'Riya Sharma')
            ->assertJsonPath('students.0.subtitle', 'ADM-1001')
            ->assertJsonPath('students.0.href', '/students/' . $student->id);

        $this->actingAs($admin)
            ->getJson('/global-search?q=amit')
            ->assertOk()
            ->assertJsonPath('staff.0.type', 'staff')
            ->assertJsonPath('staff.0.name', 'Amit Deshmukh')
            ->assertJsonPath('staff.0.href', '/staff');
    }

    public function test_teacher_sees_students_but_not_staff_results(): void
    {
        $org = $this->seedOrganization();

        $teacher = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'teacher',
            'name' => 'Teacher Khatri',
            'email' => 'khatri@school.test',
        ]);

        User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'accountant',
            'name' => 'Nilesh Accountant',
            'email' => 'nilesh@school.test',
        ]);

        Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-2001',
            'first_name' => 'Tejas',
            'last_name' => 'Patil',
            'date_of_birth' => '2012-06-01',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->getJson('/global-search?q=tejas')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonCount(0, 'staff');

        $this->actingAs($teacher)
            ->getJson('/global-search?q=nilesh')
            ->assertOk()
            ->assertJsonCount(0, 'staff');
    }

    public function test_student_search_is_scoped_to_the_current_organization(): void
    {
        $org = $this->seedOrganization();
        $otherOrg = Organization::create($this->orgFields('Other Academy', 'other-academy'));

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin One',
            'email' => 'admin@school.test',
        ]);

        Student::query()->create([
            'organization_id' => $org->id,
            'admission_no' => 'ADM-3001',
            'first_name' => 'Sneha',
            'last_name' => 'Joshi',
            'date_of_birth' => '2011-01-01',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        Student::query()->create([
            'organization_id' => $otherOrg->id,
            'admission_no' => 'ADM-X001',
            'first_name' => 'Sneha',
            'last_name' => 'Joshi',
            'date_of_birth' => '2011-01-01',
            'gender' => 'female',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->getJson('/global-search?q=sneha')
            ->assertOk()
            ->assertJsonCount(1, 'students')
            ->assertJsonPath('students.0.href', '/students/' . Student::query()->where('organization_id', $org->id)->first()->id);
    }

    public function test_blank_query_returns_empty_results(): void
    {
        $org = $this->seedOrganization();

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Two',
            'email' => 'admin2@school.test',
        ]);

        $this->actingAs($admin)
            ->getJson('/global-search?q=')
            ->assertOk()
            ->assertJsonCount(0, 'students')
            ->assertJsonCount(0, 'staff');
    }

    public function test_dashboard_shares_header_notification_props(): void
    {
        $org = $this->seedOrganization();

        $admin = User::factory()->create([
            'organization_id' => $org->id,
            'role' => 'admin',
            'name' => 'Admin Three',
            'email' => 'admin3@school.test',
            'password' => Hash::make('secret'),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('headerNotifications')
                ->where('headerNotifications.unreadCount', 0)
                ->where('chatUnread', 0));
    }

    private function seedOrganization(): Organization
    {
        return Organization::create($this->orgFields('Search School', 'search-school'));
    }

    private function orgFields(string $name, string $slug): array
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
}