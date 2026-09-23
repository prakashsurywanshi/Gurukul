<?php

namespace Tests\Feature;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\TemplateAssignment;
use App\Models\User;
use App\Services\StaffPermissionService;
use App\Services\TemplateAssignmentService;
use App\Support\TemplateCatalog;
use Database\Seeders\TemplateLibrarySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateLibrarySeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_publishes_library_designs_and_provisions_all_slots(): void
    {
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
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        $this->seed(TemplateLibrarySeeder::class);

        $this->assertSame(133, CertificateTemplate::query()->whereNull('organization_id')->count());
        $this->assertSame(20, CertificateTemplate::query()->whereNull('organization_id')->distinct('category')->count('category'));
        $this->assertSame(
            133,
            CertificateTemplate::query()->whereNull('organization_id')->whereNotNull('thumbnail_data')->count()
        );

        $editorCounts = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->selectRaw('editor_type, count(*) as total')
            ->groupBy('editor_type')
            ->pluck('total', 'editor_type')
            ->all();

        $this->assertSame(89, (int) ($editorCounts['flow'] ?? 0));
        $this->assertSame(44, (int) ($editorCounts['fabric'] ?? 0));

        $this->assertSame(
            68,
            CertificateTemplate::query()
                ->whereNull('organization_id')
                ->where('editor_type', 'flow')
                ->where(function ($q) {
                    $q->where(fn ($q) => $q->where('card_width_mm', 210)->where('card_height_mm', 297))
                        ->orWhere(fn ($q) => $q->where('card_width_mm', 297)->where('card_height_mm', 210));
                })
                ->count()
        );

        $slip = CertificateTemplate::query()
            ->whereNull('organization_id')
            ->where('title', 'like', '%Essential Fee Slip%')
            ->first();

        $this->assertNotNull($slip);
        $this->assertSame('flow', $slip->editor_type);
        $this->assertEqualsWithDelta(210, (float) $slip->card_width_mm, 0.01);
        $this->assertEqualsWithDelta(297, (float) $slip->card_height_mm, 0.01);

        $this->assertCount(count(TemplateCatalog::slots()), TemplateAssignment::query()->where('organization_id', $organization->id)->get());

        foreach (TemplateCatalog::slots() as $slot) {
            $assignment = TemplateAssignment::query()
                ->where('organization_id', $organization->id)
                ->where('slot', $slot['key'])
                ->first();

            $this->assertNotNull($assignment, "Slot [{$slot['key']}] was not provisioned.");
            $this->assertNotNull($assignment->template_id, "Slot [{$slot['key']}] has no default template.");
            $this->assertTrue($assignment->template_id === $assignment->template->id);
        }
    }

    public function test_gallery_payload_serializes_library_designs_with_thumbnails(): void
    {
        $this->seed(TemplateLibrarySeeder::class);

        $row = CertificateTemplate::query()->whereNull('organization_id')->first();

        $this->assertNotNull($row);

        $serialized = app(TemplateAssignmentService::class)->serializeTemplate($row);

        $this->assertMatchesRegularExpression('/^data:image\/(png|jpeg|svg\+xml);base64,/', $serialized['thumbnailData']);
    }

    public function test_default_templates_picker_uses_lightweight_card_payloads(): void
    {
        $this->seed(TemplateLibrarySeeder::class);

        $service = app(TemplateAssignmentService::class);

        $row = CertificateTemplate::query()->whereNull('organization_id')->firstOrFail();

        $card = $service->serializeTemplateCard($row);

        $this->assertSame((string) $row->id, $card['id']);
        $this->assertSame($row->title, $card['title']);
        $this->assertSame($row->editor_type, $card['editorType']);
        $this->assertArrayNotHasKey('content', $card);
        $this->assertArrayNotHasKey('contentJson', $card);
        $this->assertArrayNotHasKey('backContent', $card);
        $this->assertArrayNotHasKey('design', $card);
        $this->assertMatchesRegularExpression('/^data:image\/(png|jpeg|svg\+xml);base64,/', $card['thumbnailData']);

        $organization = Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school-2',
            'email' => 'admin2@gurukul.test',
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

        $admin = User::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Principal',
            'email' => 'principal2@gurukul.test',
            'password' => bcrypt('secret'),
            'role' => 'admin',
        ]);

        $response = $this->actingAs($admin)
            ->get('/template-assignments')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DefaultTemplates')
                ->has('ownTemplates')
                ->has('libraryTemplates'));

        $props = collect($response->viewData('page')['props'] ?? []);

        $librarySet = $props->get('libraryTemplates', []);
        $ownSet = $props->get('ownTemplates', []);

        $this->assertNotEmpty($librarySet);
        foreach ([...$librarySet, ...$ownSet] as $item) {
            $this->assertArrayNotHasKey('content', $item, 'picker payload must not ship full twins');
            $this->assertArrayNotHasKey('contentJson', $item);
            $this->assertArrayNotHasKey('backContent', $item);
        }
    }
}