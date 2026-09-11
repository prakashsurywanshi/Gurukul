<?php

namespace Tests\Feature;

use App\Models\GalleryAlbum;
use App\Models\GalleryImage;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GalleryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_gallery_index(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Annual Day 2025');

        $this->actingAs($admin)
            ->get('/gallery')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Gallery')
                ->has('albums', 1)
                ->where('albums.0.title', 'Annual Day 2025')
            );
    }

    public function test_admin_can_create_album(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/gallery', [
                'title' => 'Independence Day',
                'description' => 'Celebration photos',
                'is_published' => '1',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('gallery_albums', [
            'organization_id' => $organization->id,
            'title' => 'Independence Day',
            'is_published' => 1,
        ]);
    }

    public function test_album_requires_title(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');

        $this->actingAs($admin)
            ->post('/gallery', ['title' => ''])
            ->assertSessionHasErrors(['title']);
    }

    public function test_admin_can_view_album_and_upload_image(): void
    {
        Storage::fake('public');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Sports Day');

        $this->actingAs($admin)
            ->get("/gallery/{$album->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/GalleryShow')
                ->where('album.id', $album->id)
                ->has('images', 0)
            );

        $file = UploadedFile::fake()->image('winner.jpg', 800, 600);

        $this->actingAs($admin)
            ->post("/gallery/{$album->id}/images", ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk();

        $image = GalleryImage::query()->where('gallery_album_id', $album->id)->first();
        $this->assertNotNull($image);
        $this->assertSame('winner.jpg', $image->original_name);
        Storage::disk('public')->assertExists($image->storage_path);
    }

    public function test_image_upload_rejects_invalid_type(): void
    {
        Storage::fake('public');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Culture');

        $this->actingAs($admin)
            ->post("/gallery/{$album->id}/images", [
                'file' => UploadedFile::fake()->create('script.exe', 10, 'application/x-msdownload'),
            ])
            ->assertSessionHasErrors(['file']);
    }

    public function test_admin_can_update_caption(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Lab');
        $image = $this->createImage($organization, $album, $admin);

        $this->actingAs($admin)
            ->post("/gallery/images/{$image->id}/caption", ['caption' => 'Chemistry lab'])
            ->assertRedirect();

        $this->assertDatabaseHas('gallery_images', [
            'id' => $image->id,
            'caption' => 'Chemistry lab',
        ]);
    }

    public function test_admin_can_reorder_images(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Gallery');
        $first = $this->createImage($organization, $album, $admin, 'a.jpg');
        $second = $this->createImage($organization, $album, $admin, 'b.jpg');

        $this->actingAs($admin)
            ->post("/gallery/{$album->id}/reorder", ['order' => [$second->id, $first->id]])
            ->assertRedirect();

        $this->assertSame(1, GalleryImage::find($second->id)->sort_order);
        $this->assertSame(2, GalleryImage::find($first->id)->sort_order);
    }

    public function test_admin_can_delete_album_with_images(): void
    {
        Storage::fake('public');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Annual Day');
        $album->update(['cover_image_path' => 'gallery/org-'.$organization->id.'/cover.jpg']);
        Storage::disk('public')->put('gallery/org-'.$organization->id.'/cover.jpg', 'cover-bytes');
        $image = $this->createImage($organization, $album, $admin);
        Storage::disk('public')->put($image->storage_path, 'img-bytes');

        $this->actingAs($admin)
            ->delete("/gallery/{$album->id}")
            ->assertRedirect();

        $this->assertNull(GalleryAlbum::query()->find($album->id));
        $this->assertNull(GalleryImage::query()->find($image->id));
        Storage::disk('public')->assertMissing($image->storage_path);
        Storage::disk('public')->assertMissing('gallery/org-'.$organization->id.'/cover.jpg');
    }

    public function test_admin_can_delete_single_image(): void
    {
        Storage::fake('public');

        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Gallery');
        $image = $this->createImage($organization, $album, $admin);
        Storage::disk('public')->put($image->storage_path, 'img-bytes');

        $this->actingAs($admin)
            ->delete("/gallery/images/{$image->id}")
            ->assertRedirect();

        $this->assertNull(GalleryImage::query()->find($image->id));
        Storage::disk('public')->assertMissing($image->storage_path);
    }

    public function test_other_organization_cannot_access_album(): void
    {
        $organization = $this->createOrganization();
        $other = $this->createOrganization('other-school', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $admin = $this->createUser($organization, 'admin');
        $otherAdmin = $this->createUser($other, 'admin');
        $album = $this->createAlbum($organization, $admin, 'Private');

        $this->actingAs($otherAdmin)
            ->get("/gallery/{$album->id}")
            ->assertNotFound();
    }

    public function test_user_without_permission_cannot_access_gallery(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $user = $this->createUser($organization, 'parent');

        $this->actingAs($user)
            ->get('/gallery')
            ->assertForbidden();
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

    private function createAlbum(Organization $organization, User $creator, string $title): GalleryAlbum
    {
        return GalleryAlbum::query()->create([
            'organization_id' => $organization->id,
            'title' => $title,
            'is_published' => true,
            'created_by_user_id' => $creator->id,
        ]);
    }

    private function createImage(Organization $organization, GalleryAlbum $album, User $uploader, string $name = 'photo.jpg'): GalleryImage
    {
        return GalleryImage::query()->create([
            'gallery_album_id' => $album->id,
            'storage_path' => 'gallery/org-'.$organization->id.'/'.$name,
            'original_name' => $name,
            'mime_type' => 'image/jpeg',
            'size_bytes' => 1024,
            'sort_order' => 1,
            'uploaded_by_user_id' => $uploader->id,
        ]);
    }
}