<?php

namespace Tests\Feature;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\TemplateLibrarySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CanvasDesignerSaveTest extends TestCase
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

    public function test_save_on_library_template_creates_org_copy_with_content_json(): void
    {
        $library = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('title', 'Classic Portrait ID Card')
            ->firstOrFail();

        $objects = $library->content_json['objects'];
        $objects[0]['left'] = round($objects[0]['left'] + 12, 1);

        $payload = [
            'title' => 'My Custom ID Card',
            'category' => 'id_card',
            'editor_type' => 'fabric',
            'type' => 'participation',
            'description' => null,
            'content' => '<div class="cd-page">moved</div>',
            'content_json' => ['version' => '6.9.1', 'objects' => $objects],
            'back_content' => null,
            'back_content_json' => null,
            'thumbnail_data' => ['width' => 210, 'height' => 324],
            'card_width_mm' => 55.6,
            'card_height_mm' => 87.8,
        ];

        $this->actingAs($this->user)
            ->post("/canvas-designer/{$library->id}", $payload)
            ->assertRedirect(route('template-gallery'));

        $this->assertSame('Classic Portrait ID Card', $library->fresh()->title, 'library row is untouched');

        $copy = CertificateTemplate::query()
            ->where('organization_id', $this->organization->id)
            ->orderByDesc('id')
            ->first();

        $this->assertNotNull($copy);
        $this->assertSame('My Custom ID Card', $copy->title);
        $this->assertFalse($copy->is_system);
        $this->assertSame(55.6, (float) $copy->card_width_mm);
        $this->assertSame(87.8, (float) $copy->card_height_mm);
        $this->assertIsArray($copy->content_json);
        $this->assertCount(count($objects), $copy->content_json['objects']);
        $this->assertSame(0 + 12, $copy->content_json['objects'][0]['left']);
    }

    public function test_save_persists_content_json_on_org_template(): void
    {
        $template = CertificateTemplate::query()->create([
            'organization_id' => $this->organization->id,
            'title' => 'Org Design',
            'category' => 'id_card',
            'type' => 'participation',
            'editor_type' => 'fabric',
            'content' => '<div class="cd-page"></div>',
            'content_json' => ['version' => '6.9.1', 'objects' => []],
            'card_width_mm' => 54,
            'card_height_mm' => 85.6,
            'is_system' => false,
        ]);

        $payload = [
            'title' => 'Org Design',
            'category' => 'id_card',
            'editor_type' => 'fabric',
            'type' => 'participation',
            'description' => null,
            'content' => '<div class="cd-page">updated</div>',
            'content_json' => ['version' => '6.9.1', 'objects' => [['type' => 'rect', 'left' => 5, 'top' => 6]]],
            'back_content' => null,
            'back_content_json' => null,
            'thumbnail_data' => ['width' => 210, 'height' => 324],
            'card_width_mm' => 54,
            'card_height_mm' => 85.6,
        ];

        $this->actingAs($this->user)
            ->post("/canvas-designer/{$template->id}", $payload)
            ->assertRedirect(route('template-gallery'));

        $template->refresh();
        $this->assertIsArray($template->content_json);
        $this->assertCount(1, $template->content_json['objects']);
    }
}