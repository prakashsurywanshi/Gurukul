<?php

namespace App\Http\Controllers;

use App\Models\HpcActivity;
use App\Models\HpcCard;
use App\Models\HpcFramework;
use App\Models\HpcStudentCard;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\AppearanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HpcController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $frameworkCount = HpcFramework::where('organization_id', $organization->id)->count();
        $cardCount = HpcCard::where('organization_id', $organization->id)->count();
        $activityCount = HpcActivity::where('organization_id', $organization->id)->count();
        $publishedCount = HpcStudentCard::where('organization_id', $organization->id)->where('status', 'published')->count();

        $recentActivities = HpcActivity::where('organization_id', $organization->id)
            ->with('student:id,first_name,last_name')
            ->orderByDesc('id')
            ->take(10)
            ->get();

        return Inertia::render('dashboard/HpcDashboard', [
            'user' => $request->user(),
            'stats' => [
                'frameworks' => $frameworkCount,
                'cards' => $cardCount,
                'activities' => $activityCount,
                'published' => $publishedCount,
            ],
            'recentActivities' => $recentActivities,
        ]);
    }

    public function activities(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $query = HpcActivity::where('organization_id', $organization->id)
            ->with('student:id,first_name,last_name');

        $category = $request->input('category');
        if ($category) {
            $query->where('category', $category);
        }

        $activities = $query->orderByDesc('occurred_at')->get();

        $students = Student::where('organization_id', $organization->id)
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name']);

        return Inertia::render('dashboard/HpcActivities', [
            'user' => $request->user(),
            'activities' => $activities,
            'students' => $students,
            'filters' => ['category' => $category ?? ''],
        ]);
    }

    public function storeActivity(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'category' => ['required', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'teacher_remark' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        HpcActivity::create([
            'organization_id' => $organization->id,
            ...$validated,
        ]);

        return back()->with('success', 'Activity recorded.');
    }

    public function cards(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $cards = HpcCard::where('organization_id', $organization->id)
            ->with('framework:id,name')
            ->get();

        $frameworks = HpcFramework::where('organization_id', $organization->id)->get(['id', 'name']);

        return Inertia::render('dashboard/HpcCards', [
            'user' => $request->user(),
            'cards' => $cards,
            'frameworks' => $frameworks,
        ]);
    }

    public function storeCard(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'framework_id' => ['nullable', 'integer', 'exists:hpc_frameworks,id'],
            'card_type' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        HpcCard::create([
            'organization_id' => $organization->id,
            ...$validated,
        ]);

        return back()->with('success', 'Card template created.');
    }

    public function frameworks(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $frameworks = HpcFramework::where('organization_id', $organization->id)
            ->withCount('cards')
            ->get();

        return Inertia::render('dashboard/HpcFrameworks', [
            'user' => $request->user(),
            'frameworks' => $frameworks,
        ]);
    }

    public function storeFramework(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'criteria' => ['nullable', 'array'],
            'criteria.*' => ['nullable', 'string', 'max:100'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        HpcFramework::create([
            'organization_id' => $organization->id,
            ...$validated,
        ]);

        return back()->with('success', 'Framework created.');
    }

    public function cardAppearance(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        return Inertia::render('dashboard/HpcCardAppearance', [
            'user' => $request->user(),
            'settings' => app(AppearanceService::class)->normalizeForOrganization($organization, 'hpc_appearance'),
        ]);
    }

    public function saveAppearance(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $service = app(AppearanceService::class);
        $validated = $request->validate($service->rules());
        $normalized = $service->normalize($validated);

        $current = $organization->settings;
        $current['hpc_appearance'] = $normalized;

        $organization->update(['settings' => $current]);

        return back()->with('success', 'Card appearance saved.');
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

        return $organization;
    }
}