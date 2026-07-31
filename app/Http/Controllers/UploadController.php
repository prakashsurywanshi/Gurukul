<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function storeImage(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:10240'],
            'folder' => ['nullable', 'string', 'max:100'],
        ]);

        $orgId = $user->organization_id ?? 'general';
        $folder = $validated['folder'] ?? 'website-pages';
        $path = $validated['image']->store("{$folder}/{$orgId}", 'public');

        return response()->json([
            'url' => Storage::url($path),
            'path' => $path,
        ]);
    }
}
