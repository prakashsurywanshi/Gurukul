<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Database\Seeders\DemoAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoLoginFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('app.demo_login', true);
    }

    public function test_demo_login_is_disabled_when_config_is_off(): void
    {
        config()->set('app.demo_login', false);

        $this->get('/demo-login/admin')->assertNotFound();
    }

    public function test_login_page_exposes_demo_login_prop_when_enabled(): void
    {
        $this->createSeed();

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('LoginPage')
                ->where('demoLogin', true)
            );
    }

    public function test_superadmin_quick_login(): void
    {
        $this->createSeed();

        $superAdmin = $this->demoUser('super_admin');

        $this->get('/demo-login/superadmin')
            ->assertRedirect($this->landingPath($superAdmin));

        $this->assertAuthenticatedAs($superAdmin);
    }

    public function test_all_staff_and_student_quick_logins(): void
    {
        $this->createSeed();

        $cases = [
            'schooladmin' => 'admin',
            'teacher' => 'teacher',
            'accountant' => 'accountant',
            'receptionist' => 'receptionist',
            'librarian' => 'librarian',
            'driver' => 'driver',
            'parent' => 'student',
            'student' => 'student',
        ];

        foreach ($cases as $routeRole => $accountRole) {
            $user = $this->demoUser($accountRole);

            $this->get("/demo-login/{$routeRole}")
                ->assertRedirect($this->landingPath($user));

            $this->assertAuthenticatedAs($user);
        }
    }

    public function test_demo_login_requires_an_active_account(): void
    {
        $this->createSeed();

        $this->demoUser('teacher')->update(['status' => 'inactive']);

        $this->from('/login')
            ->get('/demo-login/teacher')
            ->assertRedirect('/login')
            ->assertSessionHasErrors(['email' => 'No active demo account is available for this role.']);

        $this->assertGuest();
    }

    private function createSeed(): void
    {
        Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'school@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        $this->seed(DemoAccountsSeeder::class);
    }

    private function demoUser(string $role): User
    {
        $email = $role === 'super_admin' ? 'superadmin@gurukul.com' : $role.'@gurukul.com';

        return User::query()->where('email', $email)->firstOrFail();
    }

    private function landingPath(User $user): string
    {
        return app(StaffPermissionService::class)->landingPathFor($user);
    }
}