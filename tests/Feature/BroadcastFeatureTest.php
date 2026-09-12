<?php

namespace Tests\Feature;

use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BroadcastFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function seedContext(): array
    {
        $organization = Organization::create([
            'name' => 'Broadcast School',
            'slug' => 'broadcast-school',
            'email' => 'school@broadcast.test',
            'phone' => '8888888888',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

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
            'room_number' => 'R1',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organization->id,
            'first_name' => 'Priya',
            'last_name' => 'Sharma',
            'email' => 'priya@broadcast.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'ADM-1001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'female',
            'date_of_birth' => now()->subYears(15)->toDateString(),
            'guardian_name' => 'Rahul Sharma',
            'guardian_email' => 'rahul@guardian.test',
            'guardian_phone' => '7777777777',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organization->id,
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$organization, $admin, $academicYearId, $classId, $studentId];
    }

    public function test_broadcast_history_page_loads(): void
    {
        [$organization, $admin] = $this->seedContext();

        $this->actingAs($admin)->get('/communicate/broadcast')->assertOk();
    }

    public function test_compose_broadcast_page_loads_with_options(): void
    {
        [$organization, $admin] = $this->seedContext();

        $response = $this->actingAs($admin)->get('/communicate/broadcast/create');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/BroadcastCompose')
                ->has('classOptions', 1)
                ->has('studentOptions', 1));
    }

    public function test_compose_broadcast_to_all_parents_creates_recipients(): void
    {
        [$organization, $admin] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'Fee reminder',
                'message' => 'Dear [parent_name], kindly pay pending fees.',
                'channels' => ['email', 'whatsapp'],
                'recipient_group' => 'all_parents',
            ])
            ->assertRedirect(route('communication.broadcast'));

        $this->assertDatabaseHas('broadcasts', [
            'organization_id' => $organization->id,
            'subject' => 'Fee reminder',
            'recipient_count' => 1,
            'sent_count' => 1,
        ]);

        $broadcast = Broadcast::query()->where('organization_id', $organization->id)->first();
        $this->assertSame('Rahul Sharma', $broadcast->recipients()->first()->name);
        $this->assertSame(2, BroadcastRecipient::query()->where('broadcast_id', $broadcast->id)->count());
    }

    public function test_broadcast_requires_at_least_one_channel(): void
    {
        [$organization, $admin] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'Test',
                'message' => 'Hello',
                'channels' => [],
                'recipient_group' => 'all_parents',
            ])
            ->assertSessionHasErrors('channels');
    }
}