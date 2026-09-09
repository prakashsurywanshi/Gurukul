<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/Leads', [
            'user' => $user,
            'leads' => $this->leadsForOrganization($organization, $request),
            'filters' => [
                'status' => $request->query('status', 'all'),
                'source' => $request->query('source', 'all'),
                'assignedTo' => $request->query('assignedTo', 'all'),
                'search' => $request->query('search', ''),
            ],
            'statuses' => Lead::STATUSES,
            'sources' => Lead::SOURCES,
            'priorities' => Lead::PRIORITIES,
            'staffMembers' => $this->staffMembersForOrganization($organization),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            abort(403);
        }

        $validated = $this->validatePayload($request, $organization);

        Lead::query()->create([...$validated, 'organization_id' => $organization->id, 'created_by' => $user->id]);

        return back()->with('success', 'Lead created successfully.');
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $lead->organization_id === $organization->id, 404);

        $validated = $this->validatePayload($request, $organization);

        $lead->update([...$validated, 'created_by' => $lead->created_by ?? $user->id]);

        return back()->with('success', 'Lead updated successfully.');
    }

    public function destroy(Lead $lead): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $lead->organization_id === $organization->id, 404);

        $lead->delete();

        return back()->with('success', 'Lead deleted successfully.');
    }

    private function validatePayload(Request $request, Organization $organization): array
    {
        return $request->validate([
            'student_name' => ['required', 'string', 'max:255'],
            'parent_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'source' => ['required', Rule::in(Lead::SOURCES)],
            'interested_class' => ['nullable', 'string', 'max:255'],
            'academic_year' => ['nullable', 'string', 'max:64'],
            'status' => ['required', Rule::in(Lead::STATUSES)],
            'priority' => ['required', Rule::in(Lead::PRIORITIES)],
            'preferred_contact_time' => ['nullable', 'string', 'max:64'],
            'follow_up_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
        ]);
    }

    private function leadsForOrganization(?Organization $organization, Request $request): Collection
    {
        if (!$organization) {
            return collect();
        }

        $status = $request->query('status', 'all');
        $source = $request->query('source', 'all');
        $assignedTo = $request->query('assignedTo', 'all');
        $search = trim((string) $request->query('search', ''));

        return Lead::query()
            ->with(['assignedTo', 'creator'])
            ->where('organization_id', $organization->id)
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($source !== 'all', fn ($query) => $query->where('source', $source))
            ->when($assignedTo !== 'all', fn ($query) => $query->where('assigned_to', $assignedTo))
            ->when($search !== '', fn ($query) => $query
                ->where(fn ($query) => $query
                    ->where('student_name', 'like', "%{$search}%")
                    ->orWhere('parent_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Lead $lead) => [
                'id' => $lead->id,
                'studentName' => $lead->student_name,
                'parentName' => $lead->parent_name,
                'phone' => $lead->phone,
                'email' => $lead->email,
                'source' => $lead->source,
                'interestedClass' => $lead->interested_class,
                'academicYear' => $lead->academic_year,
                'status' => $lead->status,
                'priority' => $lead->priority,
                'preferredContactTime' => $lead->preferred_contact_time,
                'followUpDate' => optional($lead->follow_up_date)->format('Y-m-d'),
                'notes' => $lead->notes,
                'assignedToName' => $lead->assignedTo?->name,
                'createdByName' => $lead->creator?->name,
                'createdAt' => optional($lead->created_at)->format('Y-m-d'),
            ])
            ->values();
    }

    private function staffMembersForOrganization(?Organization $organization): Collection
    {
        if (!$organization) {
            return collect();
        }

        $roleSlugs = Role::query()
            ->where('organization_id', $organization->id)
            ->pluck('slug')
            ->all();

        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', $roleSlugs)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $staff) => ['id' => $staff->id, 'name' => $staff->name])
            ->values();
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