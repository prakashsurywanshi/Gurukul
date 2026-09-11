<?php

namespace App\Http\Controllers;

use App\Models\GalleryAlbum;
use App\Models\GalleryImage;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class GalleryController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $search = trim((string) $request->query('search'));
        $status = trim((string) $request->query('status'));
        $canManage = in_array($user->role, ['admin', 'super_admin', 'teacher', 'receptionist', 'accountant', 'librarian'], true);

        $albums = GalleryAlbum::query()
            ->where('organization_id', $organization->id)
            ->withCount('images')
            ->orderByDesc('is_published')
            ->orderByDesc('created_at');

        if ($search !== '') {
            $albums->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (! $canManage) {
            $albums->where('is_published', true);
        } elseif ($status === 'published') {
            $albums->where('is_published', true);
        } elseif ($status === 'draft') {
            $albums->where('is_published', false);
        }

        $albums = $albums->get();

        return Inertia::render('dashboard/Gallery', [
            'user' => $user,
            'albums' => $albums->map(fn (GalleryAlbum $album) => [
                'id' => $album->id,
                'title' => $album->title,
                'description' => $album->description,
                'cover_image_url' => $album->cover_image_path ? asset('storage/' . $album->cover_image_path) : null,
                'is_published' => $album->is_published,
                'images_count' => $album->images_count,
                'created_at' => $album->created_at->toISOString(),
            ]),
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function show(Request $request, int $album): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $albumModel = GalleryAlbum::withCount('images')
            ->where('id', $album)
            ->where('organization_id', $organization->id)
            ->where(function ($q) use ($user) {
                if (! in_array($user->role, ['admin', 'super_admin', 'teacher', 'receptionist', 'accountant', 'librarian'], true)) {
                    $q->where('is_published', true);
                }
            })
            ->firstOrFail();

        $images = GalleryImage::where('gallery_album_id', $albumModel->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return Inertia::render('dashboard/GalleryShow', [
            'user' => $user,
            'album' => [
                'id' => $albumModel->id,
                'title' => $albumModel->title,
                'description' => $albumModel->description,
                'cover_image_url' => $albumModel->cover_image_path ? asset('storage/' . $albumModel->cover_image_path) : null,
                'is_published' => $albumModel->is_published,
                'images_count' => $albumModel->images_count,
                'created_at' => $albumModel->created_at->toISOString(),
            ],
            'images' => $images->map(fn (GalleryImage $img) => [
                'id' => $img->id,
                'url' => $img->url,
                'original_name' => $img->original_name,
                'caption' => $img->caption,
                'sort_order' => $img->sort_order,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255', Rule::unique('gallery_albums', 'title')->where('organization_id', $organization->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_published' => ['nullable', 'boolean'],
            'cover_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('gallery/org-' . $organization->id, 'public');
        }

        GalleryAlbum::query()->create([
            'organization_id' => $organization->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'is_published' => $data['is_published'] ?? true,
            'cover_image_path' => $coverPath,
            'created_by_user_id' => $user->id,
        ]);

        return back()->with('success', 'Album created successfully.');
    }

    public function update(Request $request, int $album): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $albumModel = GalleryAlbum::where('id', $album)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255', Rule::unique('gallery_albums', 'title')->where('organization_id', $organization->id)->ignore($albumModel->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_published' => ['nullable', 'boolean'],
            'cover_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        if ($request->hasFile('cover_image')) {
            if ($albumModel->cover_image_path) {
                Storage::disk('public')->delete($albumModel->cover_image_path);
            }
            $data['cover_image_path'] = $request->file('cover_image')->store('gallery/org-' . $organization->id, 'public');
        }

        $albumModel->update(collect($data)->only(['title', 'description', 'is_published', 'cover_image_path'])->toArray());

        return back()->with('success', 'Album updated successfully.');
    }

    public function destroy(Request $request, int $album): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $albumModel = GalleryAlbum::where('id', $album)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        try {
            foreach ($albumModel->images as $image) {
                Storage::disk('public')->delete($image->storage_path);
            }
            if ($albumModel->cover_image_path) {
                Storage::disk('public')->delete($albumModel->cover_image_path);
            }
            $albumModel->delete();
        } catch (Throwable $exception) {
            report($exception);
            return back()->with('error', 'Could not delete album.');
        }

        return back()->with('success', 'Album deleted successfully.');
    }

    public function storeImage(Request $request, int $album): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $albumModel = GalleryAlbum::where('id', $album)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $validated['file'];
        $storagePath = $file->store('gallery/org-' . $organization->id . '/albums/' . $albumModel->id, 'public');

        $maxOrder = GalleryImage::where('gallery_album_id', $albumModel->id)->max('sort_order') ?? 0;

        $image = GalleryImage::query()->create([
            'gallery_album_id' => $albumModel->id,
            'storage_path' => $storagePath,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'caption' => $validated['caption'] ?? null,
            'sort_order' => $maxOrder + 1,
            'uploaded_by_user_id' => $user->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'id' => $image->id,
                'url' => $image->url,
                'original_name' => $image->original_name,
                'caption' => $image->caption,
                'sort_order' => $image->sort_order,
            ]);
        }

        return back()->with('success', 'Image uploaded.');
    }

    public function updateCaption(Request $request, int $image): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $imageModel = GalleryImage::where('id', $image)->firstOrFail();
        $album = GalleryAlbum::where('id', $imageModel->gallery_album_id)
            ->where('organization_id', $organization->id)
            ->first();
        abort_unless($album, 404);

        $data = $request->validate([
            'caption' => ['required', 'string', 'max:255'],
        ]);

        $imageModel->update(['caption' => $data['caption']]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Caption updated.');
    }

    public function destroyImage(Request $request, int $image): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $imageModel = GalleryImage::where('id', $image)->firstOrFail();
        $album = GalleryAlbum::where('id', $imageModel->gallery_album_id)
            ->where('organization_id', $organization->id)
            ->first();
        abort_unless($album, 404);

        Storage::disk('public')->delete($imageModel->storage_path);
        $imageModel->delete();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Image deleted.');
    }

    public function reorder(Request $request, int $album): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $albumModel = GalleryAlbum::where('id', $album)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer', 'exists:gallery_images,id'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['order'] as $index => $imageId) {
                GalleryImage::where('id', $imageId)->update(['sort_order' => $index + 1]);
            }
        });

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Image order updated.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
