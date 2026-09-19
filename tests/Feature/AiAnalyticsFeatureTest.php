<?php

namespace Tests\Feature;

use App\Models\AiScore;
use App\Models\Attendance;
use App\Models\Lead;
use App\Models\StudentFee;
use App\Models\SystemNotification;
use App\Services\AiAnalytics\ScoreEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AiAnalyticsFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_ai_analytics_page(): void
    {
        $context = $this->seedContext();
        $adminId = $context['admin_id'];

        $this->actingAs($this->user($adminId))
            ->get('/ai-analytics')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AiAnalytics')
                ->has('overview', 5)
                ->has('leads')
                ->has('feeDefaulters')
                ->has('riskStudents')
                ->has('alerts'));
    }

    public function test_teacher_cannot_access_ai_analytics(): void
    {
        $context = $this->seedContext();
        $teacherId = DB::table('users')->insertGetId([
            'organization_id' => $context['organization_id'],
            'name' => 'Risk Teacher',
            'email' => 'teacher@risk.test',
            'password' => bcrypt('password'),
            'role' => 'teacher',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($this->user($teacherId))
            ->get('/ai-analytics')
            ->assertForbidden();
    }

    public function test_refresh_computes_and_stores_scores(): void
    {
        $context = $this->seedContext();
        $organizationId = $context['organization_id'];

        DB::table('leads')->insertGetId([
            'organization_id' => $organizationId,
            'student_name' => 'Hot Lead',
            'phone' => '1111111111',
            'source' => 'website',
            'status' => 'new',
            'priority' => 'high',
            'assigned_to' => $context['admin_id'],
            'created_by' => $context['admin_id'],
            'created_at' => now()->subDays(2),
            'updated_at' => now(),
        ]);

        $this->actingAs($this->user($context['admin_id']))
            ->post('/ai-analytics/refresh')
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('ai_scores', [
            'organization_id' => $organizationId,
            'category' => 'lead',
        ]);

        $this->assertDatabaseHas('ai_scores', [
            'organization_id' => $organizationId,
            'category' => 'fee_defaulter',
        ]);

        $this->assertDatabaseHas('ai_scores', [
            'organization_id' => $organizationId,
            'category' => 'student_risk',
        ]);
    }

    public function test_high_risk_crossing_creates_admin_notification_once(): void
    {
        $context = $this->seedContext();
        $organizationId = $context['organization_id'];

        $this->actingAs($this->user($context['admin_id']))
            ->post('/ai-analytics/refresh')
            ->assertRedirect();

        $this->assertDatabaseHas('notifications', [
            'organization_id' => $organizationId,
            'user_id' => $context['admin_id'],
            'type' => 'ai_risk_alert',
        ]);

        $firstCount = SystemNotification::query()->where('type', 'ai_risk_alert')->count();

        $this->actingAs($this->user($context['admin_id']))
            ->post('/ai-analytics/refresh')
            ->assertRedirect();

        $this->assertSame($firstCount, SystemNotification::query()->where('type', 'ai_risk_alert')->count());
    }

    public function test_route_suggestions_created_for_unassigned_route(): void
    {
        $context = $this->seedContext();
        $organizationId = $context['organization_id'];

        DB::table('transport_routes')->insertGetId([
            'organization_id' => $organizationId,
            'route_name' => 'Route A',
            'route_number' => 'R-A-'.now()->timestamp,
            'academic_year_id' => $context['academic_year_id'],
            'fare' => 500,
            'stops' => json_encode([['name' => 'Main Gate']]),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($this->user($context['admin_id']))
            ->post('/ai-analytics/refresh')
            ->assertRedirect();

        $this->assertDatabaseHas('ai_scores', [
            'organization_id' => $organizationId,
            'category' => 'route',
        ]);

        $this->assertGreaterThan(0, AiScore::query()->where('organization_id', $organizationId)->where('category', 'route')->count());
    }

    public function test_score_command_scores_organization(): void
    {
        $context = $this->seedContext();

        $exit = Artisan::call('ai:score', ['organization' => $context['organization_id']]);

        $this->assertSame(0, $exit);
        $this->assertDatabaseHas('ai_scores', ['organization_id' => $context['organization_id']]);
    }

    public function test_score_engine_tiers_are_deterministic(): void
    {
        $engine = new ScoreEngine();

        $huge = $engine->scoreFeeDefaulter($this->fee(12000, now()->subDays(90)));
        $this->assertSame(90, $huge['score']);
        $this->assertSame('high', $huge['tier']);

        $paidUp = $engine->scoreFeeDefaulter($this->fee(0, now()->subDays(90)));
        $this->assertSame('low', $paidUp['tier']);

        $webLead = $engine->scoreLead($this->lead('website', 'high', 'new', now()->subDays(2)));
        $this->assertGreaterThanOrEqual(70, $webLead['score']);
        $this->assertSame('high', $webLead['tier']);

        $this->assertSame('medium', $engine->tier(55));
        $this->assertSame('low', $engine->tier(10));
    }

    private function fee(float $balance, \DateTimeInterface $dueDate): StudentFee
    {
        $fee = new StudentFee();
        $fee->balance = (string) $balance;
        $fee->fine = 0;
        $fee->due_date = $dueDate;

        return $fee;
    }

    private function lead(string $source, string $priority, string $status, \DateTimeInterface $createdAt): Lead
    {
        $lead = new Lead();
        $lead->source = $source;
        $lead->priority = $priority;
        $lead->status = $status;
        $lead->assigned_to = 1;
        $lead->follow_up_date = now()->addDay();
        $lead->created_at = $createdAt;

        return $lead;
    }

    private function seedContext(string $suffix = 'risk'): array
    {
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => ucfirst($suffix).' Analytics School',
            'slug' => $suffix.'-analytics',
            'email' => $suffix.'@analytics.test',
            'phone' => '7777777777',
            'address' => 'Analytics Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('users')->insertGetId([
            'organization_id' => $organizationId,
            'name' => 'Analytics Admin',
            'email' => 'admin@'.$suffix.'.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $academicYearId = DB::table('academic_years')->insertGetId([
            'organization_id' => $organizationId,
            'name' => '2026-2027',
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_current' => true,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $classId = DB::table('classes')->insertGetId([
            'organization_id' => $organizationId,
            'academic_year_id' => $academicYearId,
            'name' => 'Class 10',
            'section' => 'A',
            'room_number' => '1A',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentId = DB::table('students')->insertGetId([
            'organization_id' => $organizationId,
            'first_name' => 'At',
            'last_name' => 'Risk',
            'email' => 'at-risk@'.$suffix.'.test',
            'class_id' => $classId,
            'status' => 'active',
            'admission_no' => 'AI-1001',
            'admission_date' => now()->toDateString(),
            'roll_number' => '1',
            'gender' => 'male',
            'date_of_birth' => now()->subYears(14)->toDateString(),
            'guardian_name' => 'Risk Guardian',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_academic_histories')->insert([
            'organization_id' => $organizationId,
            'student_id' => $studentId,
            'class_id' => $classId,
            'academic_year_id' => $academicYearId,
            'is_current' => true,
            'status' => 'active',
            'entry_type' => 'admission',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $feeStructureId = DB::table('fee_structures')->insertGetId([
            'organization_id' => $organizationId,
            'academic_year_id' => $academicYearId,
            'class_id' => $classId,
            'fee_type' => 'tuition',
            'amount' => 5000,
            'frequency' => 'monthly',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('student_fees')->insertGetId([
            'organization_id' => $organizationId,
            'student_id' => $studentId,
            'fee_structure_id' => $feeStructureId,
            'academic_year_id' => $academicYearId,
            'month' => now()->format('F'),
            'year' => (int) now()->format('Y'),
            'amount' => 5000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 5000,
            'paid_amount' => 0,
            'balance' => 5000,
            'due_date' => now()->subDays(90)->toDateString(),
            'status' => 'overdue',
            'created_at' => now()->subDays(90),
            'updated_at' => now(),
        ]);

        return [
            'organization_id' => $organizationId,
            'admin_id' => $adminId,
            'academic_year_id' => $academicYearId,
            'student_id' => $studentId,
        ];
    }

    private function user(int $id): \App\Models\User
    {
        return \App\Models\User::query()->findOrFail($id);
    }
}