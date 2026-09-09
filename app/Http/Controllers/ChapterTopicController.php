<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use App\Models\Organization;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ChapterTopicController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $subjectId = $request->integer('subject') ?: null;

        $subjects = Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ])
            ->values()
            ->all();

        $tree = [];

        if ($subjectId) {
            $chapters = Chapter::query()
                ->where('organization_id', $organization->id)
                ->where('subject_id', $subjectId)
                ->whereNull('parent_id')
                ->withCount('children')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();

            $topics = Chapter::query()
                ->where('organization_id', $organization->id)
                ->where('subject_id', $subjectId)
                ->whereNotNull('parent_id')
                ->get()
                ->groupBy('parent_id');

            $tree = $chapters
                ->map(function (Chapter $chapter) use ($topics) {
                    return [
                        'id' => $chapter->id,
                        'type' => $chapter->type,
                        'name' => $chapter->name,
                        'description' => $chapter->description,
                        'sortOrder' => $chapter->sort_order,
                        'childrenCount' => $chapter->children_count,
                        'topics' => ($topics->get($chapter->id) ?? collect())
                            ->map(fn (Chapter $topic) => [
                                'id' => $topic->id,
                                'type' => $topic->type,
                                'name' => $topic->name,
                                'description' => $topic->description,
                                'sortOrder' => $topic->sort_order,
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all();
        }

        return Inertia::render('dashboard/ChaptersTopics', [
            'user' => $user,
            'subjects' => $subjects,
            'selectedSubjectId' => $subjectId,
            'tree' => $tree,
            'totalChapters' => collect($tree)->map(fn ($chapter) => 1)->sum(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'subject_id' => ['required', Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'parent_id' => ['nullable', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $parent = null;

        if ($validated['parent_id'] ?? null) {
            $parent = Chapter::query()
                ->where('organization_id', $organization->id)
                ->where('subject_id', $validated['subject_id'])
                ->find($validated['parent_id']);

            abort_unless($parent, 404);
        }

        $maxSortOrder = (int) Chapter::query()
            ->where('organization_id', $organization->id)
            ->where('subject_id', $validated['subject_id'])
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->max('sort_order');

        Chapter::query()->create([
            'organization_id' => $organization->id,
            'subject_id' => $validated['subject_id'],
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'sort_order' => $maxSortOrder + 1,
        ]);

        return back()->with('success', $parent ? 'Topic added successfully.' : 'Chapter added successfully.');
    }

    public function update(Request $request, Chapter $chapter): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($chapter->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $chapter->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return back()->with('success', 'Updated successfully.');
    }

    public function destroy(Request $request, Chapter $chapter): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($chapter->organization_id === $organization->id, 404);

        $chapter->delete();

        return back()->with('success', 'Deleted successfully.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}