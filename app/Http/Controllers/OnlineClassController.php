<?php

namespace App\Http\Controllers;

use App\Models\OnlineClass;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class OnlineClassController extends Controller
{
    private const PROVIDERS = ['zoom', 'google_meet', 'microsoft_teams', 'custom'];
    private const STATUSES = ['scheduled', 'live', 'completed', 'cancelled'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $status = $request->query('status');
        $classId = $request->query('class_id');

        $onlineClasses = OnlineClass::query()
            ->where('organization_id', $organization->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($classId, fn ($q) => $q->where('class_id', $classId))
            ->with(['schoolClass:id,name', 'subject:id,name', 'creator:id,name'])
            ->orderByDesc('starts_at')
            ->limit(200)
            ->get()
            ->map(fn (OnlineClass $onlineClass) => [
                'id' => (string) $onlineClass->id,
                'title' => $onlineClass->title,
                'class' => $onlineClass->schoolClass?->name,
                'subject' => $onlineClass->subject?->name,
                'provider' => $onlineClass->provider,
                'meeting_url' => $onlineClass->meeting_url,
                'meeting_id' => $onlineClass->meeting_id,
                'passcode' => $onlineClass->passcode,
                'starts_at' => $onlineClass->starts_at->toIso8601String(),
                'ends_at' => $onlineClass->ends_at?->toIso8601String(),
                'status' => $onlineClass->status,
                'notes' => $onlineClass->notes,
                'created_by' => $onlineClass->creator?->name,
            ])
            ->all();

        return inertia('dashboard/OnlineClasses', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'onlineClasses' => $onlineClasses,
            'classes' => $this->classRecords($organization),
            'subjects' => $this->subjectRecords($organization),
            'selectedStatus' => $status ? (string) $status : null,
            'selectedClassId' => $classId ? (string) $classId : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        OnlineClass::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'title' => $validated['title'],
            'provider' => $validated['provider'],
            'meeting_url' => $validated['meeting_url'] ?? null,
            'meeting_id' => $validated['meeting_id'] ?? null,
            'passcode' => $validated['passcode'] ?? null,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'] ?? null,
            'status' => $validated['status'] ?? 'scheduled',
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        return redirect()->route('online-classes')->with('success', 'Online class scheduled.');
    }

    public function update(Request $request, OnlineClass $onlineClass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $onlineClass->organization_id === $organization->id, 403);

        $validated = $request->validate(
            array_merge($this->rules(), ['status' => ['required', Rule::in(self::STATUSES)]])
        );

        $onlineClass->update([
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'title' => $validated['title'],
            'provider' => $validated['provider'],
            'meeting_url' => $validated['meeting_url'] ?? null,
            'meeting_id' => $validated['meeting_id'] ?? null,
            'passcode' => $validated['passcode'] ?? null,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'] ?? null,
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('online-classes')->with('success', 'Online class updated.');
    }

    public function setStatus(Request $request, OnlineClass $onlineClass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $onlineClass->organization_id === $organization->id, 403);

        $validated = $request->validate(['status' => ['required', Rule::in(self::STATUSES)]]);

        $onlineClass->update(['status' => $validated['status']]);

        return redirect()->route('online-classes')->with('success', 'Online class status updated.');
    }

    public function destroy(OnlineClass $onlineClass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $onlineClass->organization_id === $organization->id, 403);

        $onlineClass->delete();

        return redirect()->route('online-classes')->with('success', 'Online class removed.');
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'provider' => ['required', Rule::in(self::PROVIDERS)],
            'meeting_url' => ['nullable', 'url', 'max:500'],
            'meeting_id' => ['nullable', 'string', 'max:128'],
            'passcode' => ['nullable', 'string', 'max:64'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    private function classRecords(Organization $organization): array
    {
        return SchoolClass::forCurrentSession($organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => $schoolClass->name,
            ])
            ->values()
            ->all();
    }

    private function subjectRecords(Organization $organization): array
    {
        return Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'label' => $subject->name,
            ])
            ->values()
            ->all();
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