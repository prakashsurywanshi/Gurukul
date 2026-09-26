<?php

namespace Tests\Feature;

use App\Jobs\DispatchQwaBroadcastJob;
use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\Organization;
use App\Models\User;
use App\Services\QwaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Mockery;
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

    private function seedQwaSettings(Organization $organization): void
    {
        $organization->settings = [
            'communication_settings' => [
                'qwa' => [
                    'enabled' => true,
                    'baseUrl' => 'https://qwa.test',
                    'apiKey' => 'test-key',
                    'sessionId' => 'session-1',
                ],
            ],
        ];
        $organization->save();
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
                ->has('studentOptions', 1)
                ->has('staffOptions', 1)
                ->has('placeholders')
                ->has('channels'));
    }

    public function test_compose_broadcast_to_specific_staff_creates_staff_recipients(): void
    {
        [$organization, $admin] = $this->seedContext();

        $teacherA = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
        $teacherB = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'Staff notice',
                'message' => 'Dear [recipient_name], staff meeting tomorrow.',
                'channels' => ['email'],
                'recipient_group' => 'specific_staff',
                'staff_ids' => [(string) $teacherA->id, (string) $teacherB->id],
            ])
            ->assertRedirect(route('communication.broadcast'));

        $broadcast = Broadcast::query()->where('organization_id', $organization->id)->first();

        $this->assertSame('specific_staff', $broadcast->recipient_group);
        $this->assertSame([(string) $teacherA->id, (string) $teacherB->id], $broadcast->staff_ids);
        $this->assertSame(2, BroadcastRecipient::query()->where('broadcast_id', $broadcast->id)->count());

        $this->assertDatabaseHas('broadcast_recipients', [
            'broadcast_id' => $broadcast->id,
            'user_id' => $teacherA->id,
            'name' => $teacherA->name,
            'channel' => 'email',
            'status' => 'sent',
        ]);
    }

    public function test_compose_broadcast_to_class_students_targets_students_directly(): void
    {
        [$organization, $admin, $academicYearId, $classId, $studentId] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'Class activity',
                'message' => 'Dear student, please check your class timetable.',
                'channels' => ['email'],
                'recipient_group' => 'class_students',
                'class_ids' => [(string) $classId],
            ])
            ->assertRedirect(route('communication.broadcast'));

        $broadcast = Broadcast::query()->where('organization_id', $organization->id)->first();

        $this->assertSame('class_students', $broadcast->recipient_group);
        $this->assertDatabaseHas('broadcast_recipients', [
            'broadcast_id' => $broadcast->id,
            'student_id' => $studentId,
            'name' => 'Priya Sharma',
            'contact' => 'priya@broadcast.test',
            'channel' => 'email',
            'status' => 'sent',
        ]);
    }

    public function test_specific_staff_requires_selected_staff(): void
    {
        [$organization, $admin] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'Test',
                'message' => 'Hello',
                'channels' => ['email'],
                'recipient_group' => 'specific_staff',
                'staff_ids' => [],
            ])
            ->assertSessionHasErrors('staff_ids');
    }

    public function test_qwa_broadcast_requires_configured_gateway(): void
    {
        [$organization, $admin] = $this->seedContext();

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'QWA test',
                'message' => 'Hello via QWA',
                'channels' => ['qwa_whatsapp'],
                'recipient_group' => 'all_parents',
            ])
            ->assertSessionHasErrors('qwa_delivery');
    }

    public function test_qwa_broadcast_creates_pending_phone_recipients_and_queues_jobs(): void
    {
        [$organization, $admin, , , $studentId] = $this->seedContext();

        Cache::flush();
        Queue::fake();

        $organization->settings = [
            'communication_settings' => [
                'qwa' => [
                    'enabled' => true,
                    'baseUrl' => 'https://qwa.test',
                    'apiKey' => 'test-key',
                    'sessionId' => 'session-1',
                ],
            ],
        ];
        $organization->save();

        Http::fake([
            '*sessions/*' => Http::response(['success' => true, 'status' => 'ready'], 200),
        ]);

        $this->actingAs($admin)
            ->post('/communicate/broadcast', [
                'subject' => 'QWA broadcast',
                'message' => 'Dear [parent_name], fees due [student_overall_balance_due].',
                'channels' => ['qwa_whatsapp'],
                'recipient_group' => 'all_parents',
            ])
            ->assertRedirect(route('communication.broadcast'));

        $broadcast = Broadcast::query()->where('organization_id', $organization->id)->first();

        $this->assertSame('sending', $broadcast->status);

        $this->assertDatabaseHas('broadcast_recipients', [
            'broadcast_id' => $broadcast->id,
            'student_id' => $studentId,
            'channel' => 'qwa_whatsapp',
            'status' => 'pending',
            'contact' => '917777777777',
        ]);

        Queue::assertPushed(DispatchQwaBroadcastJob::class, 1);
    }

    public function test_qwa_broadcast_job_sends_substituted_message_and_marks_sent(): void
    {
        [$organization, $admin, $academicYearId, $classId, $studentId] = $this->seedContext();

        $this->seedQwaSettings($organization);

        $broadcast = Broadcast::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'subject' => 'Fee reminder',
            'message' => 'Dear [parent_name], this is a reminder for [student_name].',
            'channels' => ['qwa_whatsapp'],
            'recipient_group' => 'all_parents',
            'recipient_count' => 1,
            'sent_count' => 0,
            'delivered_count' => 0,
            'opened_count' => 0,
            'status' => 'sending',
            'sent_at' => now(),
            'created_by' => $admin->id,
        ]);

        $recipient = BroadcastRecipient::query()->create([
            'broadcast_id' => $broadcast->id,
            'organization_id' => $organization->id,
            'student_id' => $studentId,
            'name' => 'Rahul Sharma',
            'contact' => '917777777777',
            'channel' => 'qwa_whatsapp',
            'status' => 'pending',
        ]);

        Cache::flush();

        $sentPayload = null;
        $qwaService = Mockery::mock(QwaService::class);
        $qwaService->shouldReceive('sendTextMessage')
            ->once()
            ->andReturnUsing(function (...$args) use (&$sentPayload) {
                $sentPayload = $args;

                return ['success' => true, 'statusCode' => 200, 'body' => null, 'message' => 'ok'];
            });

        (new DispatchQwaBroadcastJob($broadcast->id, $recipient->id))
            ->handle($qwaService, app(\App\Services\TemplateRenderService::class));

        $this->assertSame('917777777777@c.us', $sentPayload[3]);
        $this->assertSame('Dear Rahul Sharma, this is a reminder for Priya Sharma.', $sentPayload[4]);

        $this->assertDatabaseHas('broadcast_recipients', [
            'id' => $recipient->id,
            'status' => 'sent',
        ]);
        $this->assertNotNull($recipient->refresh()->sent_at);

        $this->assertDatabaseHas('broadcasts', [
            'id' => $broadcast->id,
            'status' => 'sent',
            'sent_count' => 1,
        ]);
    }

    public function test_qwa_broadcast_job_marks_failed_on_gateway_error(): void
    {
        [$organization, $admin, $academicYearId, $classId, $studentId] = $this->seedContext();

        $this->seedQwaSettings($organization);

        $broadcast = Broadcast::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'subject' => 'Fee reminder',
            'message' => 'Dear [parent_name], please check.',
            'channels' => ['qwa_whatsapp'],
            'recipient_group' => 'all_parents',
            'recipient_count' => 1,
            'sent_count' => 0,
            'delivered_count' => 0,
            'opened_count' => 0,
            'status' => 'sending',
            'sent_at' => now(),
            'created_by' => $admin->id,
        ]);

        $recipient = BroadcastRecipient::query()->create([
            'broadcast_id' => $broadcast->id,
            'organization_id' => $organization->id,
            'student_id' => $studentId,
            'name' => 'Rahul Sharma',
            'contact' => '917777777777',
            'channel' => 'qwa_whatsapp',
            'status' => 'pending',
        ]);

        Cache::flush();

        $qwaService = Mockery::mock(QwaService::class);
        $qwaService->shouldReceive('sendTextMessage')
            ->once()
            ->andReturn(['success' => false, 'statusCode' => 500, 'body' => null, 'message' => 'gateway down']);

        (new DispatchQwaBroadcastJob($broadcast->id, $recipient->id))
            ->handle($qwaService, app(\App\Services\TemplateRenderService::class));

        $this->assertDatabaseHas('broadcast_recipients', [
            'id' => $recipient->id,
            'status' => 'failed',
        ]);
        $this->assertDatabaseHas('broadcasts', [
            'id' => $broadcast->id,
            'status' => 'failed',
            'sent_count' => 0,
        ]);
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