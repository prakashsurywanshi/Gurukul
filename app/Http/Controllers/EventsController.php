<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class EventsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $month = $request->query('month');
        $year = $request->query('year');

        $selectedMonth = $month !== null ? (int) $month : (int) now()->month;
        $selectedYear = $year !== null ? (int) $year : (int) now()->year;

        return inertia('dashboard/EventsCalendar', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'events' => $this->eventPayload($organization, $selectedMonth, $selectedYear),
            'selectedMonth' => $selectedMonth,
            'selectedYear' => $selectedYear,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(['holiday', 'exam', 'sports', 'cultural', 'meeting', 'other'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:20'],
            'is_holiday' => ['nullable', 'boolean'],
        ]);

        SchoolEvent::query()->create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? $validated['start_date'],
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'location' => $validated['location'] ?? null,
            'color' => $validated['color'] ?? $this->colorForType($validated['type']),
            'is_holiday' => (bool) ($validated['is_holiday'] ?? false),
            'created_by' => $user->id,
        ]);

        return redirect()->route('events')->with('success', 'Event created successfully.');
    }

    public function update(Request $request, SchoolEvent $schoolEvent): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $schoolEvent->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(['holiday', 'exam', 'sports', 'cultural', 'meeting', 'other'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:20'],
            'is_holiday' => ['nullable', 'boolean'],
        ]);

        $schoolEvent->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? $validated['start_date'],
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'location' => $validated['location'] ?? null,
            'color' => $validated['color'] ?? $this->colorForType($validated['type']),
            'is_holiday' => (bool) ($validated['is_holiday'] ?? false),
        ]);

        return redirect()->route('events')->with('success', 'Event updated successfully.');
    }

    public function destroy(SchoolEvent $schoolEvent): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $schoolEvent->organization_id === $organization->id, 403);

        $schoolEvent->delete();

        return redirect()->route('events')->with('success', 'Event deleted successfully.');
    }

    private function eventPayload(Organization $organization, int $month, int $year): array
    {
        return SchoolEvent::query()
            ->where('organization_id', $organization->id)
            ->whereYear('start_date', $year)
            ->whereMonth('start_date', $month)
            ->orderBy('start_date')
            ->get()
            ->map(fn (SchoolEvent $event) => [
                'id' => (string) $event->id,
                'title' => $event->localized('title'),
                'description' => $event->description,
                'type' => $event->type,
                'start_date' => $event->start_date->format('Y-m-d'),
                'end_date' => optional($event->end_date)->format('Y-m-d'),
                'start_time' => $event->start_time,
                'end_time' => $event->end_time,
                'location' => $event->location,
                'color' => $event->color,
                'is_holiday' => (bool) $event->is_holiday,
            ])
            ->values()
            ->all();
    }

    private function colorForType(string $type): string
    {
        return match ($type) {
            'holiday' => '#ef4444',
            'exam' => '#8b5cf6',
            'sports' => '#f59e0b',
            'cultural' => '#ec4899',
            'meeting' => '#10b981',
            default => '#3b82f6',
        };
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}