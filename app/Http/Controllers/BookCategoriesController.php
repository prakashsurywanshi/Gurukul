<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BookCategoriesController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'librarian'], true), 403);

        $categories = $organization
            ? LibraryBook::query()
                ->where('organization_id', $organization->id)
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->orderBy('category')
                ->get()
                ->groupBy(fn (LibraryBook $book) => (string) $book->category)
                ->map(fn ($books, string $category) => [
                    'name' => $category,
                    'count' => $books->count(),
                    'available' => $books->sum(fn (LibraryBook $book) => max((int) $book->available_copies, 0)),
                ])
                ->values()
                ->all()
            : [];

        return Inertia::render('dashboard/BookCategories', [
            'user' => $user,
            'categories' => $categories,
            'totalBooks' => $organization
                ? LibraryBook::query()->where('organization_id', $organization->id)->count()
                : 0,
        ]);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}