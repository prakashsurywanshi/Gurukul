<?php

namespace Tests\Feature;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\User;
use App\Support\FlowContentSanitizer;
use Database\Seeders\TemplateLibrarySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FlowEditorTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::query()->create([
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
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        $this->user = User::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Principal',
            'email' => 'principal@gurukul.test',
            'password' => bcrypt('secret'),
            'role' => 'admin',
        ]);

        $this->seed(TemplateLibrarySeeder::class);
    }

    public function test_gallery_use_on_flow_template_redirects_into_the_flow_editor(): void
    {
        $library = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('title', 'like', '%Essential Fee Slip%')
            ->firstOrFail();

        $this->assertSame('flow', $library->editor_type);

        $this->actingAs($this->user)
            ->post("/template-gallery/use/{$library->id}")
            ->assertRedirect();

        $copy = CertificateTemplate::query()
            ->where('organization_id', $this->organization->id)
            ->where('title', 'like', '%Essential Fee Slip%')
            ->firstOrFail();

        $this->actingAs($this->user)
            ->get("/flow-editor/{$copy->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FlowEditor')
                ->where('template.id', (string) $copy->id)
                ->where('template.editorType', 'flow'));
    }

    public function test_flow_editor_save_persists_sanitized_twin_and_nulls_stale_content_json(): void
    {
        $template = CertificateTemplate::query()->create([
            'organization_id' => $this->organization->id,
            'title' => 'Org Flow Slip',
            'category' => 'fee_receipt',
            'type' => 'completion',
            'editor_type' => 'flow',
            'content' => '<div style="border:1px solid #ccc"><table><tr><td>{{school_name}}</td></tr></table></div>',
            'content_json' => ['version' => '6.9.1', 'objects' => []],
            'card_width_mm' => 210,
            'card_height_mm' => 297,
            'is_system' => false,
        ]);

        $payload = [
            'title' => 'Org Flow Slip Updated',
            'category' => 'fee_receipt',
            'description' => 'Edited flow design',
            'content' =>
                '<style>@page { size: A4 portrait; margin: 8mm; }</style>'
                .'<div style="width:100%;text-align:center"><h1>{{school_name}}</h1>'
                .'<table><tr><td>{{student_name}}</td></tr></table>'
                .'<img src="{{student_photo_url}}" style="width:30mm;height:38mm" />'
                .'<script>alert(1)</script></div>',
            'card_width_mm' => 210,
            'card_height_mm' => 297,
            'card_size_preset' => 'a4_portrait',
        ];

        $this->actingAs($this->user)
            ->post("/flow-editor/{$template->id}", $payload)
            ->assertRedirect(route('template-gallery'));

        $this->actingAs($this->user)
            ->get('/template-gallery')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/TemplateGallery')
                ->where('flash.success', 'Template updated successfully.'));

        $template->refresh();

        $this->assertSame('Org Flow Slip Updated', $template->title);
        $this->assertSame('flow', $template->editor_type);
        $this->assertStringContainsString('@page', $template->content);
        $this->assertStringContainsString('<table>', $template->content);
        $this->assertStringContainsString('{{student_photo_url}}', $template->content);
        $this->assertStringContainsString('{{student_name}}', $template->content);
        $this->assertStringNotContainsString('<script', $template->content);
        $this->assertNull($template->content_json);
        $this->assertEqualsWithDelta(210, (float) $template->card_width_mm, 0.01);
        $this->assertEqualsWithDelta(297, (float) $template->card_height_mm, 0.01);
        $this->assertSame('a4_portrait', $template->design_settings['card_size_preset'] ?? null);
    }

    public function test_flow_editor_save_accepts_nullable_size(): void
    {
        $template = CertificateTemplate::query()->create([
            'organization_id' => $this->organization->id,
            'title' => 'Nullable Size Flow',
            'category' => 'fee_receipt',
            'type' => 'completion',
            'editor_type' => 'flow',
            'content' => '<div>Page flow</div>',
            'card_width_mm' => 210,
            'card_height_mm' => 297,
            'is_system' => false,
        ]);

        $this->actingAs($this->user)
            ->post("/flow-editor/{$template->id}", [
                'title' => 'Nullable Size Flow',
                'category' => 'fee_receipt',
                'description' => null,
                'content' => '<div>Page flow without a fixed card size</div>',
                'card_width_mm' => null,
                'card_height_mm' => null,
                'card_size_preset' => '',
            ])
            ->assertRedirect(route('template-gallery'));

        $template->refresh();

        $this->assertNull($template->card_width_mm);
        $this->assertNull($template->card_height_mm);
        $this->assertSame('flow', $template->editor_type);
    }

    public function test_flow_editor_save_on_library_template_creates_org_copy(): void
    {
        $library = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('title', 'like', '%Essential Fee Slip%')
            ->firstOrFail();

        $this->actingAs($this->user)
            ->post("/flow-editor/{$library->id}", [
                'title' => 'My School Fee Slip',
                'category' => 'fee_receipt',
                'description' => null,
                'content' => '<div>{{school_name}} — customized slip</div>',
                'card_width_mm' => 210,
                'card_height_mm' => 297,
                'card_size_preset' => 'a4_portrait',
            ])
            ->assertRedirect(route('template-gallery'));

        $this->assertSame('flow', $library->fresh()->editor_type);
        $this->assertStringNotContainsString('customized', $library->fresh()->content, 'library row is untouched');

        $copy = CertificateTemplate::query()
            ->where('organization_id', $this->organization->id)
            ->where('title', 'My School Fee Slip')
            ->firstOrFail();

        $this->assertFalse((bool) $copy->is_system);
        $this->assertSame('flow', $copy->editor_type);
        $this->assertNull($copy->content_json);
        $this->assertStringContainsString('customized', $copy->content);
    }

    public function test_flow_editor_rejects_canvas_template(): void
    {
        $canvas = CertificateTemplate::query()->create([
            'organization_id' => null,
            'title' => 'Canvas Bound Row',
            'category' => 'certificate',
            'type' => 'completion',
            'editor_type' => 'fabric',
            'content' => '<div class="cd-page"></div>',
            'content_json' => ['objects' => []],
            'is_system' => true,
        ]);

        $this->actingAs($this->user)
            ->get("/flow-editor/{$canvas->id}")
            ->assertNotFound();
    }

    public function test_flow_editor_opens_a_blank_new_design(): void
    {
        $this->actingAs($this->user)
            ->get('/flow-editor')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/FlowEditor')
                ->where('template', null)
                ->where('cardWidthMm', 210)
                ->where('cardHeightMm', 297));
    }

    public function test_flow_editor_creates_new_flow_template_from_scratch(): void
    {
        $this->actingAs($this->user)
            ->post('/flow-editor', [
                'title' => 'Brand New Flow Slip',
                'category' => 'fee_receipt',
                'description' => 'Fresh design',
                'content' => '<h1>{{school_name}}</h1><table><tr><td>{{student_name}}</td></tr></table>',
                'card_width_mm' => 210,
                'card_height_mm' => 297,
                'card_size_preset' => 'a4_portrait',
            ])
            ->assertRedirect(route('template-gallery'));

        $created = CertificateTemplate::query()
            ->where('organization_id', $this->organization->id)
            ->where('title', 'Brand New Flow Slip')
            ->firstOrFail();

        $this->assertFalse((bool) $created->is_system);
        $this->assertSame('flow', $created->editor_type);
        $this->assertSame('fee_receipt', $created->category);
        $this->assertStringContainsString('{{school_name}}', $created->content);
        $this->assertNull($created->content_json);
        $this->assertEqualsWithDelta(210, (float) $created->card_width_mm, 0.01);
        $this->assertEqualsWithDelta(297, (float) $created->card_height_mm, 0.01);
        $this->assertSame('flow-editor', $created->design_settings['source'] ?? null);

        $this->actingAs($this->user)
            ->get('/template-gallery')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/TemplateGallery')
                ->where('flash.success', 'Template created successfully.'));
    }

    public function test_flow_editor_duplicates_library_template_into_org_copy(): void
    {
        $library = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('title', 'like', '%Essential Fee Slip%')
            ->firstOrFail();

        $this->actingAs($this->user)
            ->post("/flow-editor/{$library->id}/duplicate")
            ->assertRedirect();

        $copy = CertificateTemplate::query()
            ->where('organization_id', $this->organization->id)
            ->where('title', 'like', '%(Copy)%')
            ->firstOrFail();

        $this->assertSame('flow', $copy->editor_type);
        $this->assertFalse((bool) $copy->is_system);
    }

    public function test_flow_content_sanitizer_removes_scripts_and_handlers_but_keeps_design(): void
    {
        $html =
            '<style>@page { size: A4 portrait; }</style>'
            .'<div style="width:100%" onclick="steal()" onmouseover="x()"><table><tr>'
            .'<td>{{school_name}}</td></tr></table>'
            .'<a href="javascript:alert(1)">bad</a>'
            .'<img src="{{qr_code_url}}" width="40" height="40" />'
            .'<script src="https://evil.example/x.js"></script></div>';

        $clean = FlowContentSanitizer::sanitize($html);

        $this->assertStringContainsString('@page', $clean);
        $this->assertStringContainsString('<table>', $clean);
        $this->assertStringContainsString('{{school_name}}', $clean);
        $this->assertStringContainsString('<img src="{{qr_code_url}}" width="40" height="40">', $clean);
        $this->assertStringContainsString('{{qr_code_url}}', $clean);
        $this->assertStringContainsString('style="width:100%"', $clean);
        $this->assertStringNotContainsString('<script', $clean);
        $this->assertStringNotContainsString('onclick', $clean);
        $this->assertStringNotContainsString('onmouseover', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);

        $this->assertStringContainsString(
            '{{teacher_remark}}',
            FlowContentSanitizer::sanitize('<div title="x">{{teacher_remark}}</div>'),
            'tokens inside body text survive'
        );
    }
}