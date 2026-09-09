<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\TimeSlot;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TimeSlotsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $slots = TimeSlot::query()
            ->where('organization_id', $organization->id)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (TimeSlot $slot) => [
                'id' => $slot->id,
                'name' => $slot->name,
                'startTime' => $slot->start_time,
                'endTime' => $slot->end_time,
                'slotType' => $slot->slot_type,
                'sortOrder' => $slot->sort_order,
            ])
            ->values()
            ->all();

        return Inertia::render('dashboard/ManagePeriods', [
            'user' => $user,
            'slots' => $slots,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'slot_type' => ['required', Rule::in(['period', 'break'])],
        ]);

        $maxSortOrder = (int) TimeSlot::query()
            ->where('organization_id', $organization->id)
            ->max('sort_order');

        TimeSlot::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'start_time' => $validated['start_time'] . ':00',
            'end_time' => $validated['end_time'] . ':00',
            'slot_type' => $validated['slot_type'],
            'sort_order' => $maxSortOrder + 1,
        ]);

        return back()->with('success', 'Time slot added successfully.');
    }

    public function update(Request $request, TimeSlot $timeSlot): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($timeSlot->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'slot_type' => ['required', Rule::in(['period', 'break'])],
        ]);

        $timeSlot->update([
            'name' => $validated['name'],
            'start_time' => $validated['start_time'] . ':00',
            'end_time' => $validated['end_time'] . ':00',
            'slot_type' => $validated['slot_type'],
        ]);

        return back()->with('success', 'Time slot updated successfully.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['required', 'integer'],
        ]);

        foreach ($validated['order'] as $index => $slotId) {
            $slot = TimeSlot::query()
                ->where('organization_id', $organization->id)
                ->find($slotId);

            if ($slot) {
                $slot->update(['sort_order' => $index + 1]);
            }
        }

        return back()->with('success', 'Order saved successfully.');
    }

    public function destroy(Request $request, TimeSlot $timeSlot): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($timeSlot->organization_id === $organization->id, 404);

        $timeSlot->delete();

        return back()->with('success', 'Time slot deleted successfully.');
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