<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.demo_login' => true]);
    }

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Demo School',
            'slug' => 'demo-school',
            'email' => 'school@demo.test',
            'phone' => '5550000003',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organization,
            'name' => 'Demo Admin',
            'email' => 'admin@demo.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->insert([
            'organization_id' => $organization,
            'name' => 'Demo Teacher',
            'email' => 'teacher@demo.test',
            'password' => bcrypt('password'),
            'role' => 'teacher',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->insert([
            'organization_id' => $organization,
            'name' => 'Demo Accountant',
            'email' => 'accountant@demo.test',
            'password' => bcrypt('password'),
            'role' => 'accountant',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->insert([
            'organization_id' => $organization,
            'name' => 'Demo Parent Link',
            'email' => 'parent@demo.test',
            'password' => bcrypt('password'),
            'role' => 'student',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$adminId, $organization];
    }

    public function test_admin_demo_login_redirects_to_dashboard(): void
    {
        $this->seedContext();

        $this->get('/demo-login/schooladmin')
            ->assertRedirect('/dashboard');

        $this->assertAuthenticated();
    }

    public function test_schooladmin_alias_maps_to_org_admin_landing(): void
    {
        $this->seedContext();

        $this->get('/demo-login/schooladmin')->assertRedirect('/dashboard');
    }

    public function test_teacher_demo_login_logs_in_teacher(): void
    {
        $this->seedContext();

        $this->get('/demo-login/teacher')
            ->assertRedirect('/dashboard');
    }

    public function test_accountant_demo_login_redirects_to_fees_dashboard(): void
    {
        [$adminId, $organization] = $this->seedContext();

        $this->get('/demo-login/accountant')->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs(\App\Models\User::query()->where('email', 'accountant@demo.test')->first());
    }

    public function test_parent_demo_login_logs_in_student_portal_account(): void
    {
        $this->seedContext();

        $this->get('/demo-login/parent')->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs(\App\Models\User::query()->where('email', 'parent@demo.test')->first());
    }

    public function test_unknown_role_is_not_found(): void
    {
        $this->seedContext();

        $this->get('/demo-login/totally-not-a-role')->assertNotFound();
    }

    public function test_demo_login_is_disabled_when_config_off(): void
    {
        config(['app.demo_login' => false]);

        $this->seedContext();

        $this->get('/demo-login/schooladmin')->assertNotFound();
        $this->assertGuest();
    }

    public function test_demo_login_is_disabled_without_demo_seed_users(): void
    {
        $this->get('/demo-login/schooladmin')->assertRedirect('/login');
    }
}