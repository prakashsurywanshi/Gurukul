<?php

namespace App\Http\Controllers;

use App\Models\EngagementBirthday;
use App\Models\FestivalGreeting;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EngagementController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $users = User::query()
            ->where('organization_id', $organization->id)
            ->whereNotNull('date_of_birth')
            ->orderBy('date_of_birth')
            ->get(['id', 'name', 'role', 'date_of_birth']);

        $birthdays = $users->map(fn (User $user) => [
            'source' => 'auto',
            'person_name' => $user->name,
            'person_type' => $user->role,
            'birth_date' => $user->date_of_birth->toDateString(),
            'month' => (int) $user->date_of_birth->format('n'),
            'day' => (int) $user->date_of_birth->format('d'),
            'id' => 'user-'.$user->id,
        ])->concat(
            EngagementBirthday::query()
                ->where('organization_id', $organization->id)
                ->get()
                ->map(fn (EngagementBirthday $birthday) => [
                    'source' => 'manual',
                    'id' => 'entry-'.$birthday->id,
                    'entryId' => $birthday->id,
                    'person_name' => $birthday->person_name,
                    'person_type' => $birthday->person_type,
                    'birth_date' => $birthday->birth_date->toDateString(),
                    'month' => (int) $birthday->birth_date->format('n'),
                    'day' => (int) $birthday->birth_date->format('d'),
                    'notes' => $birthday->notes,
                ])
        )->values();

        $thisMonth = (int) now()->format('n');
        $upcoming = $birthdays->filter(fn ($birthday) => $birthday['month'] === $thisMonth && $birthday['day'] >= now()->day)
            ->sortBy('day')
            ->take(15)
            ->values();

        $today = sprintf('%02d-%02d', $thisMonth, (int) now()->day);

        return Inertia::render('dashboard/Engagement', [
            'user' => $user,
            'birthdaysThisMonth' => $birthdays->filter(fn ($birthday) => $birthday['month'] === $thisMonth)->count(),
            'birthdaysToday' => $birthdays->filter(fn ($birthday) => sprintf('%02d-%02d', $birthday['month'], $birthday['day']) === $today)->values(),
            'upcomingBirthdays' => $upcoming,
            'greetings' => FestivalGreeting::query()->where('organization_id', $organization->id)->orderByDesc('festival_date')->get()->map(fn (FestivalGreeting $greeting) => [
                'id' => $greeting->id,
                'title' => $greeting->title,
                'message' => $greeting->message,
                'festivalDate' => $greeting->festival_date?->toDateString(),
                'status' => $greeting->status,
                'sentCount' => $greeting->sent_count,
            ]),
        ]);
    }

    public function storeBirthday(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'person_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date'],
            'person_type' => ['required', Rule::in(['staff', 'student', 'other'])],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('organization_id', $organization->id)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        EngagementBirthday::query()->create($validated + ['organization_id' => $organization->id]);

        return back()->with('success', 'Birthday added.');
    }

    public function destroyBirthday(Request $request, EngagementBirthday $engagementBirthday): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($engagementBirthday->organization_id === $organization->id, 404);

        $engagementBirthday->delete();

        return back()->with('success', 'Birthday removed.');
    }

    public function storeGreeting(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'festival_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['pending', 'sent'])],
        ]);

        FestivalGreeting::query()->create($validated + ['organization_id' => $organization->id]);

        return back()->with('success', 'Festival greeting added.');
    }

    public function destroyGreeting(Request $request, FestivalGreeting $festivalGreeting): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($festivalGreeting->organization_id === $organization->id, 404);

        $festivalGreeting->delete();

        return back()->with('success', 'Greeting removed.');
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
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