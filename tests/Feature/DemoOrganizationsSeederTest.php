<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Database\Seeders\DemoOrganizationsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoOrganizationsSeederTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_ACCOUNTS = [
        'school' => ['email' => 'admin@gurukul.com', 'password' => 'admin123'],
        'college' => ['email' => 'admin@college.gurukul.com', 'password' => 'college123'],
        'coaching' => ['email' => 'admin@coaching.gurukul.com', 'password' => 'coaching123'],
        'university' => ['email' => 'admin@university.gurukul.com', 'password' => 'university123'],
    ];

    public function test_seeder_creates_one_active_organization_per_type(): void
    {
        $this->seed(DemoOrganizationsSeeder::class);

        foreach (self::ADMIN_ACCOUNTS as $type => $account) {
            $this->assertDatabaseHas('organizations', [
                'type' => $type,
                'email' => $account['email'],
                'status' => 'active',
            ]);
        }
    }

    public function test_each_demo_admin_account_can_log_in(): void
    {
        $this->seed(DemoOrganizationsSeeder::class);

        foreach (self::ADMIN_ACCOUNTS as $type => $account) {
            $organization = Organization::query()->where('email', $account['email'])->firstOrFail();

            $user = User::query()->where('email', $account['email'])->firstOrFail();
            $this->assertSame($organization->id, $user->organization_id);
            $this->assertSame('admin', $user->role);
            $this->assertTrue(Hash::check($account['password'], $user->password));

            $this->post('/login', [
                'email' => $account['email'],
                'password' => $account['password'],
            ])->assertRedirect();

            $this->assertAuthenticatedAs($user);
            $this->post('/logout');
        }
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(DemoOrganizationsSeeder::class);
        $this->seed(DemoOrganizationsSeeder::class);

        foreach (self::ADMIN_ACCOUNTS as $type => $account) {
            $this->assertSame(
                1,
                Organization::query()->where('email', $account['email'])->count(),
                "Duplicate {$type} demo organization created."
            );

            $this->assertSame(
                1,
                User::query()->where('email', $account['email'])->count(),
                "Duplicate {$type} demo admin created."
            );
        }
    }
}
