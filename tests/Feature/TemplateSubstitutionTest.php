<?php

namespace Tests\Feature;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Services\TemplateRenderService;
use Database\Seeders\TemplateLibrarySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateSubstitutionTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'admin@gurukul.test',
            'phone' => '+91 141 400 1234',
            'address' => '12, Knowledge Park',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'pincode' => '302001',
            'country' => 'India',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => ['currency' => 'INR'],
        ]);

        $this->seed(TemplateLibrarySeeder::class);
    }

    public function test_no_imported_template_leaks_literal_placeholders_at_print(): void
    {
        $svc = app(TemplateRenderService::class);
        $context = $svc->schoolAndStudentContext($this->organization);
        $leaks = [];

        foreach (CertificateTemplate::query()->whereNull('organization_id')->get() as $template) {
            foreach ([$template->content, $template->back_content] as $html) {
                $rendered = $svc->substitute((string) $html, $context);
                if (preg_match('/\{\{[a-z_0-9]{2,}\}\}/i', $rendered)) {
                    $leaks[] = $template->title;
                }
            }
        }

        $this->assertSame([], $leaks);
    }

    public function test_school_level_tokens_render_organization_settings(): void
    {
        $svc = app(TemplateRenderService::class);
        $context = $svc->schoolAndStudentContext($this->organization);

        $html = '<p>{{school_name}}</p><p>{{school_address}}</p><p>{{school_phone}}</p>'
            .'<p>{{school_email}}</p><p>{{currency_symbol}}1,000</p>';

        $this->assertSame(
            '<p>Gurukul Public School</p><p>12, Knowledge Park</p><p>+91 141 400 1234</p>'
            .'<p>admin@gurukul.test</p><p>₹1,000</p>',
            $svc->substitute($html, $context)
        );
    }

    public function test_empty_image_source_is_removed(): void
    {
        $svc = app(TemplateRenderService::class);
        $html = '<img src="{{student_photo_url}}"><p>name</p>';

        $this->assertSame('<p>name</p>', $svc->substitute($html, []));
    }

    public function test_placeholder_catalog_is_in_sync_with_substitution_registry(): void
    {
        $catalogTokens = [];
        foreach (\App\Support\TemplateCatalog::placeholderGroups() as $group) {
            foreach ($group['items'] as $item) {
                $catalogTokens[$item['token']] = $item;
                $this->assertContains($item['kind'], ['text', 'image', 'table'], "{$item['tag']} has a valid kind");
                $this->assertContains($item['availability'], ['always', 'exam', 'result', 'fee', 'doc'], "{$item['tag']} has a valid availability");
            }
        }

        $registryTokens = array_keys(\App\Support\TemplateCatalog::tokenDataKeys());

        $this->assertSame([], array_values(array_diff_key($catalogTokens, array_flip($registryTokens))), 'Every catalog token is substitutable');
        $this->assertSame([], array_values(array_diff($registryTokens, array_keys($catalogTokens))), 'Every substitutable token is exposed in the catalog');
    }

    public function test_design_using_every_token_prints_without_literal_placeholders(): void
    {
        $svc = app(TemplateRenderService::class);
        $context = $svc->schoolAndStudentContext($this->organization);

        // A design that drops every substitutable token onto the page must print
        // with zero literal {{...}} survivors (rich slots simply render empty).
        $fragments = [];
        foreach (array_keys(\App\Support\TemplateCatalog::tokenDataKeys()) as $token) {
            $fragments[] = '<span>'.$token.'</span>';
        }
        $rendered = $svc->substitute('<div>'.implode('', $fragments).'</div>', $context);

        $this->assertSame(0, preg_match('/\{\{[a-z_0-9]{2,}\}\}/i', $rendered));
    }
}