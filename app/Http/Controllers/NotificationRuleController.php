<?php

namespace App\Http\Controllers;

use App\Models\NotificationRule;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class NotificationRuleController extends Controller
{
    public const EVENT_TYPES = [
        'leave_request' => 'Leave Request',
        'admission_enquiry' => 'Admission Enquiry',
        'lead' => 'Lead',
        'complaint' => 'Complaint',
        'attendance_correction' => 'Attendance Correction',
        'fee_concession' => 'Fee Concession',
        'approval_request' => 'Approval Request',
        'fee_due' => 'Fee Due',
        'daily_digest' => 'Daily Digest',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        return Inertia::render('dashboard/NotificationRules', [
            'user' => $user,
            'rules' => NotificationRule::query()
                ->where('organization_id', $organization->id)
                ->orderBy('event_type')
                ->get()
                ->map(fn (NotificationRule $rule) => $this->serialize($rule))
                ->values()
                ->all(),
            'eventOptions' => collect(self::EVENT_TYPES)
                ->map(fn (string $label, string $event) => ['event' => $event, 'label' => $label])
                ->values()
                ->all(),
            'roleOptions' => ['admin', 'super_admin', 'teacher', 'receptionist', 'accountant', 'librarian'],
            'channelOptions' => ['bell', 'email', 'sms'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $validated = $this->validateRule($request, $organization);

        NotificationRule::query()->updateOrCreate(
            [
                'organization_id' => $organization->id,
                'event_type' => $validated['event_type'],
            ],
            [
                'label' => $validated['label'],
                'is_active' => (bool) ($validated['is_active'] ?? true),
                'channels' => $validated['channels'],
                'recipient_roles' => $validated['recipient_roles'] ?? null,
                'digest_summary' => $validated['digest_summary'] ?? null,
            ]
        );

        return back()->with('success', 'Notification rule updated.');
    }

    public function toggle(Request $request, NotificationRule $notificationRule): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $notificationRule->organization_id === $organization->id, 403);
        $this->abortUnlessAdmin($user);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $notificationRule->update(['is_active' => (bool) $validated['is_active']]);

        return back()->with('success', 'Notification rule '.((bool) $validated['is_active'] ? 'enabled' : 'disabled').'.');
    }

    public function destroy(Request $request, NotificationRule $notificationRule): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $notificationRule->organization_id === $organization->id, 403);
        $this->abortUnlessAdmin($user);

        $notificationRule->delete();

        return back()->with('success', 'Notification rule removed.');
    }

    private function validateRule(Request $request, Organization $organization): array
    {
        $validated = $request->validate([
            'event_type' => ['required', 'string', Rule::in(array_keys(self::EVENT_TYPES))],
            'label' => ['nullable', 'string', 'max:120'],
            'is_active' => ['nullable', 'boolean'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => ['required', Rule::in(['bell', 'email', 'sms'])],
            'recipient_roles' => ['nullable', 'array'],
            'recipient_roles.*' => ['required', 'string'],
            'digest_summary' => ['nullable', 'string', 'max:500'],
        ]);

        $validated['label'] = $validated['label'] ?? (self::EVENT_TYPES[$validated['event_type']] ?? $validated['event_type']);
        $validated['is_active'] = (bool) ($validated['is_active'] ?? true);

        return $validated;
    }

    private function serialize(NotificationRule $rule): array
    {
        return [
            'id' => $rule->id,
            'event_type' => $rule->event_type,
            'label' => $rule->label,
            'is_active' => $rule->is_active,
            'channels' => $rule->channels ?? ['bell'],
            'recipient_roles' => $rule->recipient_roles,
            'digest_summary' => $rule->digest_summary,
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }
}