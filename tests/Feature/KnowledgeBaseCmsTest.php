<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\KnowledgeBaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KnowledgeBaseCmsTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_knowledge_base_cms_page_loads_default_content(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $this->actingAs($superAdmin)
            ->get(route('superadmin.knowledge-base-cms'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('superAdminView', 'knowledge-base-cms')
                ->where('knowledgeBaseContent.title', 'Gurukul Knowledge Base')
                ->has('knowledgeBaseContent.modules.0')
                ->has('knowledgeBaseContent.faqs.0')
            );
    }

    public function test_super_admin_can_update_knowledge_base_content(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
        ]);

        $payload = [
            'title' => 'Campus Knowledge Hub',
            'subtitle' => 'Operational answers for staff.',
            'search_placeholder' => 'Search the hub...',
            'documentation_title' => 'Guides',
            'documentation_subtitle' => 'Module guides for teams.',
            'faq_title' => 'Answers',
            'faq_subtitle' => 'Quick help for common questions.',
            'modules' => [
                [
                    'id' => 'admissions',
                    'title' => 'Admissions',
                    'summary' => 'How admissions work.',
                    'content' => 'Capture enquiry, verify documents, then enroll the student.',
                ],
            ],
            'faqs' => [
                [
                    'id' => 'how-to-enroll',
                    'question' => 'How do I enroll a student?',
                    'answer' => 'Open the admission enquiry and convert it after approval.',
                ],
            ],
        ];

        $this->actingAs($superAdmin)
            ->patch(route('superadmin.knowledge-base-cms.update'), $payload)
            ->assertRedirect(route('superadmin.knowledge-base-cms'));

        $content = app(KnowledgeBaseService::class)->content();

        $this->assertSame('Campus Knowledge Hub', $content['title']);
        $this->assertSame('Admissions', $content['modules'][0]['title']);
        $this->assertSame('How do I enroll a student?', $content['faqs'][0]['question']);
    }

    public function test_staff_knowledge_base_page_uses_saved_content(): void
    {
        app(KnowledgeBaseService::class)->save([
            'title' => 'Campus Knowledge Hub',
            'subtitle' => 'Operational answers for staff.',
            'search_placeholder' => 'Search the hub...',
            'documentation_title' => 'Guides',
            'documentation_subtitle' => 'Module guides for teams.',
            'faq_title' => 'Answers',
            'faq_subtitle' => 'Quick help for common questions.',
            'modules' => [
                [
                    'id' => 'attendance',
                    'title' => 'Attendance',
                    'summary' => 'Daily attendance steps.',
                    'content' => 'Mark class-wise attendance before submitting the day.',
                ],
            ],
            'faqs' => [
                [
                    'id' => 'attendance-timing',
                    'question' => 'When should attendance be marked?',
                    'answer' => 'Attendance should be marked during the first active period.',
                ],
            ],
        ]);

        $organization = Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'admin@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get(route('knowledge-base'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/KnowledgeBase')
                ->where('knowledgeBaseContent.title', 'Campus Knowledge Hub')
                ->where('knowledgeBaseContent.modules.0.title', 'Attendance')
                ->where('knowledgeBaseContent.faqs.0.question', 'When should attendance be marked?')
            );
    }
}