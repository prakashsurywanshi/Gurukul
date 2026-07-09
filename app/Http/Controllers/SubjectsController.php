<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class SubjectsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/SubjectsManagement', [
            'user' => $user,
            'subjects' => $organization
                ? Subject::query()
                    ->where('organization_id', $organization->id)
                    ->orderBy('name')
                    ->orderBy('code')
                    ->get()
                    ->map(fn (Subject $subject) => [
                        'id' => $subject->id,
                        'name' => $subject->name,
                        'code' => $subject->code,
                        'type' => $subject->type,
                        'description' => $subject->description,
                        'created_at' => optional($subject->created_at)?->toDateTimeString(),
                    ])
                    ->all()
                : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'type' => ['required', Rule::in(['theory', 'practical', 'both'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'type' => $validated['type'],
            'description' => $validated['description'] ?: null,
        ]);

        return redirect()->route('subjects')->with('success', 'Subject created successfully.');
    }

    public function update(Request $request, Subject $subject): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $subject->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'type' => ['required', Rule::in(['theory', 'practical', 'both'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $subject->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'type' => $validated['type'],
            'description' => $validated['description'] ?: null,
        ]);

        return redirect()->route('subjects')->with('success', 'Subject updated successfully.');
    }

    public function destroy(Subject $subject): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $subject->organization_id === $organization->id, 403);

        $subject->delete();

        return redirect()->route('subjects')->with('success', 'Subject deleted successfully.');
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
