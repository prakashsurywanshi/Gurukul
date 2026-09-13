<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardExtrasFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = DB::table('organizations')->insertGetId([
            'name' => 'Extras School',
            'slug' => 'extras-school',
            'email' => 'extras@school.test',
            'phone' => '5550000001',
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
            'name' => 'Admin User',
            'email' => 'admin@extras.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [User::query()->find($adminId)];
    }

    public function test_contact_support_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/contact-support')->assertOk();
    }

    public function test_all_transactions_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/all-transactions')->assertOk();
    }

    public function test_data_validator_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/data-validator')->assertOk();
    }

    public function test_inspections_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/inspections')->assertOk();
    }

    public function test_classwork_logbook_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/classwork-logbook')->assertOk();
    }

    public function test_creatives_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/creatives')->assertOk();
    }

public function test_agent_logs_page_loads(): void
    {
        [$admin] = $this->seedContext();
        $this->actingAs($admin)->get('/agent-logs')->assertOk();
    }

    public function test_dashboard_includes_upcoming_events(): void
    {
        [$admin] = $this->seedContext();

        $orgId = $admin->organization_id;
        $eventId = DB::table('events')->insertGetId([
            'organization_id' => $orgId,
            'title' => 'Annual Day Celebration',
            'description' => 'Cultural event',
            'type' => 'cultural',
            'start_date' => now()->addDays(5)->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'is_holiday' => false,
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DashboardHome')
                ->has('upcomingEvents', 1)
                ->where('upcomingEvents.0.title', 'Annual Day Celebration')
                ->where('upcomingEvents.0.type', 'cultural'));
    }

    public function test_dashboard_upcoming_events_empty_when_none(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('upcomingEvents', []));
    }

    public function test_sections_page_loads(): void
    {
        [$admin] = $this->seedContext();

        $this->actingAs($admin)->get('/sections')->assertOk();
    }
}