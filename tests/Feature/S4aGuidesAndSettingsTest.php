<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class S4aGuidesAndSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_survey_guide(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/survey/guide')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/SurveyGuide'));
    }

    public function test_admin_and_teacher_can_view_lesson_planner_guide(): void
    {
        [$organization, $admin] = $this->seedRole();
        $teacher = $this->createTeacher();

        $this->actingAs($admin)
            ->get('/lesson-plan/guide')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/LessonPlannerGuide'));

        $this->actingAs($teacher)->get('/lesson-plan/guide')->assertOk();
    }

    public function test_lesson_planner_settings_loads_with_defaults(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/lesson-plan/settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/LessonPlannerSettings')
                ->where('lessonPlannerSettings.default_duration', 40)
                ->where('lessonPlannerSettings.require_approval', true)
                ->where('lessonPlannerSettings.auto_carry_forward', true));
    }

    public function test_admin_can_update_lesson_planner_settings(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->patch('/lesson-plan/settings', [
                'default_duration' => 45,
                'require_approval' => false,
                'auto_carry_forward' => true,
            ])
            ->assertRedirect(route('lesson-plan.settings'));

        $organization->refresh();
        $this->assertSame(45, $organization->settings['lesson_planner_settings']['default_duration']);
        $this->assertFalse($organization->settings['lesson_planner_settings']['require_approval']);
    }

    public function test_admin_can_view_auto_send_settings(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/engagement/auto-send-settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/AutoSendSettings')
                ->where('autoSendSettings.auto_send_birthdays', false)
                ->where('autoSendSettings.channel', 'sms'));
    }

    public function test_admin_can_update_auto_send_settings(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->patch('/engagement/auto-send-settings', [
                'auto_send_birthdays' => true,
                'auto_send_greetings' => true,
                'birthday_notification_time' => '08:30',
                'greeting_days_ahead' => 5,
                'channel' => 'email',
            ])
            ->assertSessionDoesntHaveErrors();

        $organization->refresh();
        $autoSend = $organization->settings['engagement_auto_send'];
        $this->assertTrue($autoSend['auto_send_birthdays']);
        $this->assertSame('08:30', $autoSend['birthday_notification_time']);
        $this->assertSame('email', $autoSend['channel']);
    }

    public function test_teacher_is_forbidden_from_auto_send_settings(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $teacher = $this->createTeacher();

        $this->actingAs($teacher)->get('/engagement/auto-send-settings')->assertForbidden();
    }

    private function seedRole(): array
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    private function createTeacher(): User
    {
        $organization = Organization::query()->latest('id')->first();

        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'S4a Settings School '.$counter,
            'slug' => 's4a-settings-school-'.$counter,
            'email' => 's4a-settings-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Pune',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '411001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
        ]);
    }
}