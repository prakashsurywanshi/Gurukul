<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Services\PdfService;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

class PdfServiceAndPrintCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_print_center_renders_document_registry(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->get('/print-center')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PrintCenter')
                ->has('documents', 8)
                ->where('documents.0.key', 'report-card')
                ->where('documents.3.key', 'hpc')
            );
    }

    public function test_non_privileged_role_cannot_access_print_center(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = $this->createUser($organization, 'driver');

        $this->actingAs($driver)->get('/print-center')->assertForbidden();
    }

    public function test_dompdf_driver_produces_valid_pdf(): void
    {
        config(['pdf.driver' => 'dompdf']);

        $response = app(PdfService::class)->download('<h1>Hello PDF</h1>', 'sample.pdf');

        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type') ?: '');
        $this->assertStringContainsString('attachment; filename=sample.pdf', $response->headers->get('content-disposition') ?: '');
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_stream_returns_inline_pdf(): void
    {
        config(['pdf.driver' => 'dompdf']);

        $response = app(PdfService::class)->stream('<h1>Inline</h1>', 'inline.pdf', ['paper' => 'a4']);

        $this->assertStringContainsString('inline', $response->headers->get('content-disposition') ?: '');
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_browser_driver_returns_printable_html(): void
    {
        config(['pdf.driver' => 'browser']);

        $response = app(PdfService::class)->download('<p>Print me</p>', 'print.html', ['title' => 'My Doc']);

        $this->assertStringContainsString('text/html', $response->headers->get('content-type') ?: '');
        $this->assertStringContainsString('<p>Print me</p>', $response->getContent());
        $this->assertStringContainsString('window.print()', $response->getContent());
        $this->assertStringContainsString('<title>My Doc</title>', $response->getContent());
    }

    public function test_chromium_driver_falls_back_to_dompdf_when_unavailable(): void
    {
        config(['pdf.driver' => 'chromium', 'pdf.chromium_binary' => null]);

        $response = app(PdfService::class)->download('<h1>Fallback</h1>', 'fallback.pdf');

        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type') ?: '');

        if (! $response instanceof BinaryFileResponse) {
            $this->assertStringStartsWith('%PDF', $response->getContent());
        }
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'PDF School '.$counter,
            'slug' => 'pdf-school-'.$counter,
            'email' => 'pdf-school-'.$counter.'@example.com',
        ]);
    }

    private function createUser(Organization $organization, string $role): User
    {
        static $counter = 0;
        $counter++;

        return User::factory()->create([
            'name' => ucfirst($role).' PDF User',
            'email' => $role.'-pdf-'.$counter.'@example.com',
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }
}