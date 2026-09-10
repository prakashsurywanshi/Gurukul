<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\EngagementBirthday;
use App\Models\FestivalGreeting;
use App\Models\Organization;
use App\Models\Survey;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Models\WalletCredit;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EngagementCommsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'UTC']);
        date_default_timezone_set('UTC');
    }

    public function test_admin_can_create_survey_and_staff_can_respond(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/surveys')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Surveys')
                ->has('surveys', 0)
                ->where('canManage', true)
            );

        $this->actingAs($admin)->post('/surveys', [
            'title' => 'Staff Satisfaction',
            'description' => 'Annual pulse check',
            'audience' => 'staff',
            'status' => 'active',
            'starts_on' => now()->toDateString(),
            'ends_on' => now()->addDays(30)->toDateString(),
            'questions' => [
                ['question' => 'How do you feel overall?', 'type' => 'rating', 'options' => []],
                ['question' => 'Department', 'type' => 'choice', 'options' => ['Academic', 'Admin']],
                ['question' => 'Would you recommend?', 'type' => 'yesno', 'options' => []],
                ['question' => 'Suggestions', 'type' => 'text', 'options' => []],
            ],
        ])->assertRedirect();

        $survey = Survey::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($survey);
        $this->assertSame(4, SurveyQuestion::query()->where('survey_id', $survey->id)->count());

        $this->actingAs($admin)
            ->put("/surveys/{$survey->id}", ['status' => 'closed'])
            ->assertRedirect();
        $this->assertSame('closed', $survey->fresh()->status);

        $this->actingAs($admin)
            ->put("/surveys/{$survey->id}", ['status' => 'active'])
            ->assertRedirect();

        $questions = $survey->questions->sortBy('sort_order')->values();

        $this->actingAs($admin)->post('/surveys/respond', [
            'survey_id' => $survey->id,
            'answers' => [
                ['question_id' => $questions[0]->id, 'rating' => 4],
                ['question_id' => $questions[1]->id, 'choices' => ['Academic']],
                ['question_id' => $questions[2]->id, 'choices' => ['Yes']],
                ['question_id' => $questions[3]->id, 'answer_text' => 'Keep up the good work'],
            ],
        ])->assertRedirect();

        $response = SurveyResponse::query()->where('survey_id', $survey->id)->first();
        $this->assertNotNull($response);
        $this->assertSame($admin->id, $response->respondent_user_id);

        $this->actingAs($admin)
            ->get('/surveys')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Surveys')
                ->has('surveys', 1)
                ->where('surveys.0.responsesCount', 1)
                ->where('surveys.0.avgRating', 4)
                ->where('summary.totalResponses', 1)
            );
    }

    public function test_duplicate_survey_response_is_rejected(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $survey = Survey::query()->create([
            'organization_id' => $organization->id,
            'title' => 'Pulse',
            'audience' => 'staff',
            'status' => 'active',
        ]);
        $question = SurveyQuestion::query()->create([
            'survey_id' => $survey->id,
            'question' => 'Rate us',
            'type' => 'rating',
            'sort_order' => 0,
        ]);

        $payload = ['survey_id' => $survey->id, 'answers' => [['question_id' => $question->id, 'rating' => 3]]];

        $this->actingAs($admin)->post('/surveys/respond', $payload)->assertRedirect();
        $this->actingAs($admin)->post('/surveys/respond', $payload)->assertStatus(422);

        $this->assertSame(1, SurveyResponse::query()->where('survey_id', $survey->id)->count());
    }

    public function test_admin_can_manage_engagement_birthdays_and_greetings(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $birthdayTeacher = User::factory()->create([
            'name' => 'Fiesta Foote',
            'email' => 'fiesta@example.com',
            'role' => 'teacher',
            'organization_id' => $organization->id,
            'date_of_birth' => now()->format('Y-m-d'),
        ]);

        $this->actingAs($admin)
            ->get('/engagement')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Engagement')
                ->where('birthdaysThisMonth', 1)
                ->has('birthdaysToday', 1)
            );

        $this->actingAs($admin)->post('/engagement/birthdays', [
            'person_name' => 'Guest Alumnus',
            'birth_date' => now()->addDay()->format('Y-m-d'),
            'person_type' => 'other',
        ])->assertRedirect();

        $entry = EngagementBirthday::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($entry);

        $this->actingAs($admin)->post('/engagement/greetings', [
            'title' => 'Diwali Wishes',
            'message' => 'Happy Diwali everyone!',
            'festival_date' => now()->addDays(10)->format('Y-m-d'),
            'status' => 'pending',
        ])->assertRedirect();

        $greeting = FestivalGreeting::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($greeting);
        $this->assertSame('pending', $greeting->status);

        $this->actingAs($admin)
            ->get('/engagement')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('greetings', 1)->has('upcomingBirthdays', 2));

        $this->actingAs($admin)->delete("/engagement/greetings/{$greeting->id}")->assertRedirect();
        $this->assertNull(FestivalGreeting::find($greeting->id));

        $this->actingAs($admin)->delete("/engagement/birthdays/{$entry->id}")->assertRedirect();
        $this->assertNull(EngagementBirthday::find($entry->id));
    }

    public function test_admin_can_manage_comms_wallet(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($admin)
            ->get('/comms-wallet')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CommsWallet')
                ->where('summary.totalBalance', 0)
            );

        $this->actingAs($admin)->post('/comms-wallet', [
            'wallet_type' => 'whatsapp',
            'credits' => 5000,
            'transaction_type' => 'credit',
            'description' => 'Monthly top up',
        ])->assertRedirect();

        $topup = WalletCredit::query()->where('organization_id', $organization->id)->whereNull('staff_user_id')->first();
        $this->assertNotNull($topup);
        $this->assertSame(5000.0, (float) $topup->balance_after);

        $this->actingAs($admin)->post('/comms-wallet', [
            'wallet_type' => 'whatsapp',
            'credits' => 2000,
            'transaction_type' => 'debit',
            'description' => 'Campaign usage',
        ])->assertRedirect();

        $this->assertSame(3000.0, (float) WalletCredit::query()->where('organization_id', $organization->id)->latest('id')->value('balance_after'));

        $this->actingAs($admin)->post('/comms-wallet/give', [
            'staff_user_id' => $receptionist->id,
            'wallet_type' => 'sms',
            'credits' => 250,
            'description' => 'Front office SMS allowance',
        ])->assertRedirect();

        $allocation = WalletCredit::query()->where('organization_id', $organization->id)->where('staff_user_id', $receptionist->id)->first();
        $this->assertNotNull($allocation);
        $this->assertSame(250.0, (float) $allocation->balance_after);

        $this->actingAs($admin)
            ->get('/comms-wallet')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/CommsWallet')
                ->has('balances', 4)
                ->where('balances.2.balance', 3000)
                ->has('perStaff', 1)
                ->where('perStaff.0.staffName', 'Receptionist User')
                ->has('ledger', 3)
            );

        $this->actingAs($admin)->delete("/comms-wallet/{$allocation->id}")->assertRedirect();
        $this->assertNull(WalletCredit::find($allocation->id));
    }

    public function test_admin_can_moderate_chat_messages(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');
        $teacher = $this->createUser($organization, 'teacher');

        $flagged = ChatMessage::query()->create([
            'organization_id' => $organization->id,
            'sender_user_id' => $teacher->id,
            'conversation_key' => 'room-1',
            'body' => 'This message needs review',
            'message_type' => 'chat',
            'is_flagged' => true,
            'moderation_status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->get('/chat-moderation')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ChatModeration')
                ->has('messages', 1)
                ->where('summary.flagged', 1)
            );

        $this->actingAs($admin)->post("/chat-moderation/{$flagged->id}/moderate", [
            'moderation_status' => 'hidden',
            'action' => 'hide',
            'reason' => 'Inappropriate language',
        ])->assertRedirect();

        $flagged->refresh();
        $this->assertSame('hidden', $flagged->moderation_status);
        $this->assertSame('Inappropriate language', $flagged->moderation_reason);
        $this->assertSame($admin->id, $flagged->moderated_by);
        $this->assertNotNull($flagged->moderated_at);

        $this->actingAs($admin)->post("/chat-moderation/{$flagged->id}/moderate", [
            'moderation_status' => 'visible',
            'action' => 'approve',
        ])->assertRedirect();

        $this->assertSame('visible', $flagged->fresh()->moderation_status);
        $this->assertFalse($flagged->fresh()->is_flagged);
    }

    public function test_non_admin_cannot_access_engagement_pages(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)->get('/surveys')->assertStatus(403);
        $this->actingAs($receptionist)->get('/engagement')->assertStatus(403);
        $this->actingAs($receptionist)->get('/comms-wallet')->assertStatus(403);
        $this->actingAs($receptionist)->get('/chat-moderation')->assertStatus(403);
    }

    public function test_cross_organization_engagement_records_are_not_accessible(): void
    {
        $organizationA = $this->createOrganization();
        $organizationB = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organizationA);

        $adminA = $this->createUser($organizationA, 'admin');
        $adminB = $this->createUser($organizationB, 'admin');
        $teacherB = $this->createUser($organizationB, 'teacher');

        $surveyB = Survey::query()->create([
            'organization_id' => $organizationB->id,
            'title' => 'Org B only',
            'audience' => 'staff',
            'status' => 'active',
        ]);
        $entryB = EngagementBirthday::query()->create([
            'organization_id' => $organizationB->id,
            'person_name' => 'Org B Guest',
            'birth_date' => now()->format('Y-m-d'),
            'person_type' => 'other',
        ]);
        $messageB = ChatMessage::query()->create([
            'organization_id' => $organizationB->id,
            'sender_user_id' => $teacherB->id,
            'body' => 'Org B secret',
            'moderation_status' => 'pending',
        ]);

        $this->actingAs($adminA)->put("/surveys/{$surveyB->id}", ['status' => 'closed'])->assertNotFound();
        $this->actingAs($adminA)->delete("/engagement/birthdays/{$entryB->id}")->assertNotFound();
        $this->actingAs($adminA)->post("/chat-moderation/{$messageB->id}/moderate", [
            'moderation_status' => 'hidden',
            'action' => 'hide',
        ])->assertNotFound();

        $this->assertSame('active', Survey::find($surveyB->id)->status);
        $this->assertNotNull(EngagementBirthday::find($entryB->id));
        $this->assertNotNull(ChatMessage::find($messageB->id));

        $this->actingAs($adminB)->post('/comms-wallet', [
            'wallet_type' => 'email',
            'credits' => 100,
            'transaction_type' => 'credit',
        ])->assertRedirect();
        $this->assertSame(1, WalletCredit::query()->where('organization_id', $organizationB->id)->count());
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'Engagement Test School '.$counter,
            'slug' => 'engagement-test-school-'.$counter,
            'email' => 'engagement-org'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}