<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentVaultTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_document_vault_page(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $this->createDocument($organization, $admin, 'Admission Policy', 'Policies');

        $this->actingAs($admin)
            ->get('/document-vault')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/DocumentVault')
                ->has('documents', 1)
                ->where('documents.0.title', 'Admission Policy')
                ->where('documents.0.category', 'Policies')
            );
    }

    public function test_admin_can_upload_document(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $file = UploadedFile::fake()->create('policy.pdf', 100, 'application/pdf');

        $this->actingAs($admin)
            ->post('/document-vault', [
                'file' => $file,
                'title' => 'Admission Policy',
                'category' => 'Policies',
                'description' => 'School admission rules',
            ])
            ->assertRedirect();

        $document = Document::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($document);
        $this->assertSame('Admission Policy', $document->title);
        $this->assertSame('policy.pdf', $document->original_name);
        $this->assertSame('application/pdf', $document->mime_type);
        $this->assertSame($admin->id, $document->uploaded_by_user_id);

        Storage::disk('local')->assertExists($document->storage_path);
    }

    public function test_upload_requires_valid_file_and_title(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/document-vault', [
                'file' => UploadedFile::fake()->create('script.exe', 10, 'application/x-msdownload'),
                'title' => '',
                'category' => 'Other',
            ])
            ->assertSessionHasErrors(['file', 'title']);
    }

    public function test_admin_can_download_document(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        Storage::disk('local')->put('document-vault/org-'.$organization->id.'/policy.pdf', 'pdf-bytes');
        $document = Document::query()->create([
            'organization_id' => $organization->id,
            'uploaded_by_user_id' => $admin->id,
            'category' => 'Policies',
            'title' => 'Admission Policy',
            'storage_path' => 'document-vault/org-'.$organization->id.'/policy.pdf',
            'original_name' => 'policy.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 9,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->get("/document-vault/{$document->id}/download")
            ->assertOk()
            ->assertDownload('policy.pdf');
    }

    public function test_admin_can_delete_document(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        Storage::disk('local')->put('document-vault/org-'.$organization->id.'/policy.pdf', 'pdf-bytes');
        $document = $this->createDocument($organization, $admin, 'Admission Policy', 'Policies');
        $document->update(['storage_path' => 'document-vault/org-'.$organization->id.'/policy.pdf']);

        $this->actingAs($admin)
            ->delete("/document-vault/{$document->id}")
            ->assertRedirect();

        $this->assertNull(Document::query()->find($document->id));
        Storage::disk('local')->assertMissing($document->storage_path);
    }

    public function test_other_organization_cannot_access_document(): void
    {
        Storage::fake('local');

        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($other, 'admin');
        $document = $this->createDocument($organization, $admin, 'Admission Policy', 'Policies');

        $this->actingAs($otherAdmin)
            ->get("/document-vault/{$document->id}/download")
            ->assertNotFound();
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $slug = 'gurukul-public-school', string $email = 'admin@gurukul.test'): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => $slug,
            'email' => $email,
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
    }

    private function createDocument(
        Organization $organization,
        User $uploader,
        string $title,
        string $category
    ): Document {
        return Document::query()->create([
            'organization_id' => $organization->id,
            'uploaded_by_user_id' => $uploader->id,
            'category' => $category,
            'title' => $title,
            'storage_path' => 'document-vault/org-'.$organization->id.'/'.str_replace(' ', '-', $title).'.pdf',
            'original_name' => str_replace(' ', '-', $title).'.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 9,
            'status' => 'active',
        ]);
    }
}