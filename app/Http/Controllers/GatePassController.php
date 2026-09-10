<?php

namespace App\Http\Controllers;

use App\Models\GatePass;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GatePassController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $statusFilter = trim((string) $request->query('status'));
        $passTypeFilter = trim((string) $request->query('pass_type'));
        $search = trim((string) $request->query('search'));

        $query = GatePass::query()
            ->where('organization_id', $organization->id)
            ->with('createdBy:id,name');

        if (in_array($statusFilter, ['open', 'closed', 'cancelled'], true)) {
            $query->where('status', $statusFilter);
        }

        if (in_array($passTypeFilter, ['entry', 'exit'], true)) {
            $query->where('pass_type', $passTypeFilter);
        }

        if ($search !== '') {
            $query->where('person_name', 'like', "%{$search}%");
        }

        $passes = $query->orderByDesc('created_at')->limit(200)->get();

        $studentOptions = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->limit(300)
            ->get(['id', 'first_name', 'last_name', 'registration_number'])
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'roll' => $student->registration_number,
            ])
            ->values();

        $staffOptions = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', [...RolePermissionCatalog::staffRoleSlugs(), 'super_admin'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $staff) => [
                'id' => $staff->id,
                'name' => $staff->name,
            ])
            ->values();

        return Inertia::render('dashboard/GatePasses', [
            'user' => $user,
            'passes' => $passes->map(fn (GatePass $pass) => $this->serialize($pass)),
            'openCount' => GatePass::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'open')
                ->count(),
            'studentOptions' => $studentOptions,
            'staffOptions' => $staffOptions,
            'filters' => [
                'status' => $statusFilter,
                'passType' => $passTypeFilter,
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'person_type' => ['required', Rule::in(['student', 'staff'])],
            'pass_type' => ['required', Rule::in(['entry', 'exit'])],
            'reason' => ['required', 'string', 'max:500'],
            'expected_return_at' => ['nullable', 'date'],
            'student_id' => [
                Rule::requiredIf($request->input('person_type') === 'student'),
                'nullable',
                'integer',
                Rule::exists('students', 'id')->where('organization_id', $organization->id),
            ],
            'staff_user_id' => [
                Rule::requiredIf($request->input('person_type') === 'staff'),
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where('organization_id', $organization->id),
            ],
        ]);

        [$personName, $personContact] = $this->resolvePerson(
            $organization,
            $validated['person_type'],
            $validated['student_id'] ?? null,
            $validated['staff_user_id'] ?? null
        );

        GatePass::query()->create([
            'organization_id' => $organization->id,
            'person_type' => $validated['person_type'],
            'student_id' => $validated['student_id'] ?? null,
            'staff_user_id' => $validated['staff_user_id'] ?? null,
            'person_name' => $personName,
            'person_contact' => $personContact,
            'pass_type' => $validated['pass_type'],
            'reason' => $validated['reason'],
            'expected_return_at' => $validated['expected_return_at'] ?? null,
            'status' => 'open',
            'created_by_user_id' => $user->id,
        ]);

        return back()->with('success', 'Gate pass issued successfully.');
    }

    public function markUsed(Request $request, GatePass $gatePass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $gatePass->organization_id === $organization->id, 404);

        if ($gatePass->status !== 'open') {
            return back()->with('error', 'Only open gate passes can be checked.');
        }

        $gatePass->update([
            'status' => 'closed',
            'used_at' => now(),
        ]);

        return back()->with('success', 'Gate pass marked as used.');
    }

    public function cancel(Request $request, GatePass $gatePass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $gatePass->organization_id === $organization->id, 404);

        if (!in_array($gatePass->status, ['open', 'closed'], true)) {
            return back()->with('error', 'This gate pass can no longer be cancelled.');
        }

        $gatePass->update(['status' => 'cancelled']);

        return back()->with('success', 'Gate pass cancelled.');
    }

    public function destroy(Request $request, GatePass $gatePass): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $gatePass->organization_id === $organization->id, 404);

        $gatePass->delete();

        return back()->with('success', 'Gate pass deleted.');
    }

    private function resolvePerson(Organization $organization, string $personType, ?int $studentId, ?int $staffUserId): array
    {
        if ($personType === 'student') {
            $student = Student::query()
                ->where('organization_id', $organization->id)
                ->find($studentId);

            return [
                trim($student->first_name.' '.$student->last_name),
                $student->phone ?? null,
            ];
        }

        $staff = User::query()
            ->where('organization_id', $organization->id)
            ->find($staffUserId);

        return [$staff->name, $staff->phone ?? null];
    }

    private function serialize(GatePass $pass): array
    {
        return [
            'id' => (string) $pass->id,
            'personType' => $pass->person_type,
            'personName' => $pass->person_name,
            'personContact' => $pass->person_contact,
            'passType' => $pass->pass_type,
            'reason' => $pass->reason,
            'expectedReturnAt' => optional($pass->expected_return_at)->toISOString(),
            'usedAt' => optional($pass->used_at)->toISOString(),
            'status' => $pass->status,
            'createdByName' => $pass->createdBy?->name,
            'createdAt' => optional($pass->created_at)->toISOString(),
        ];
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