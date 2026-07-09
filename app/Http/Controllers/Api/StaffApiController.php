<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StaffApiController extends Controller
{
    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $roleRecords = $this->staffPermissionService->roleRecords($organization);
        $roleSlugs = collect($roleRecords)->pluck('slug')->all();

        $query = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', $roleSlugs);

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%");
            });
        }

        $users = $query->with(['designation', 'department'])->orderBy('name')->get()->map(function (User $u) {
            return $this->serializeUser($u);
        });

        return response()->json([
            'success' => true,
            'data' => $users,
            'roles' => $roleRecords,
            'designations' => Designation::where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']),
            'departments' => Department::where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked.'], 403);
        }

        $roleRecords = $this->staffPermissionService->roleRecords($organization);
        $roleSlugs = collect($roleRecords)->pluck('slug')->all();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:1000',
            'role' => ['required', Rule::in($roleSlugs)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'employee_id' => 'nullable|string|max:50',
            'date_of_birth' => 'nullable|date',
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'joining_date' => 'nullable|date',
            'designation_id' => ['nullable', 'integer', Rule::exists('designations', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
        ]);

        $user = User::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'],
            'employee_id' => $validated['employee_id'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
            'joining_date' => $validated['joining_date'] ?? null,
            'designation_id' => $validated['designation_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff member created successfully',
            'data' => $this->serializeUser($user),
        ], 201);
    }

    public function update(Request $request, User $staff)
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || $staff->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $roleRecords = $this->staffPermissionService->roleRecords($organization);
        $roleSlugs = collect($roleRecords)->pluck('slug')->all();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staff->id)],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:1000',
            'role' => ['required', Rule::in($roleSlugs)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'employee_id' => 'nullable|string|max:50',
            'date_of_birth' => 'nullable|date',
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'joining_date' => 'nullable|date',
            'designation_id' => ['nullable', 'integer', Rule::exists('designations', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
        ]);

        $staff->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'],
            'employee_id' => $validated['employee_id'] ?? $staff->employee_id,
            'date_of_birth' => $validated['date_of_birth'] ?? $staff->date_of_birth,
            'gender' => $validated['gender'] ?? $staff->gender,
            'city' => $validated['city'] ?? $staff->city,
            'state' => $validated['state'] ?? $staff->state,
            'pincode' => $validated['pincode'] ?? $staff->pincode,
            'joining_date' => $validated['joining_date'] ?? $staff->joining_date,
            'designation_id' => $validated['designation_id'] ?? $staff->designation_id,
            'department_id' => $validated['department_id'] ?? $staff->department_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff member updated successfully',
            'data' => $this->serializeUser($staff),
        ]);
    }

    public function updateStatus(Request $request, User $staff)
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || $staff->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if ($staff->is($currentUser) && $validated['status'] !== 'active') {
            return response()->json(['success' => false, 'message' => 'You cannot deactivate your own account.'], 422);
        }

        $staff->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Staff status updated',
            'data' => $this->serializeUser($staff),
        ]);
    }

    public function resetPassword(Request $request, User $staff)
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || $staff->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if (!$staff->email) {
            return response()->json(['success' => false, 'message' => 'Staff has no email address.'], 422);
        }

        $temporaryPassword = Str::password(12);

        $staff->update(['password' => Hash::make($temporaryPassword)]);

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
            'temporary_password' => $temporaryPassword,
        ]);
    }

    public function destroy(User $staff)
    {
        $currentUser = Auth::user();
        $organization = $this->resolveOrganizationForUser($currentUser);

        if (!$organization || $staff->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($staff->is($currentUser)) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own account.'], 422);
        }

        $staff->delete();

        return response()->json(['success' => true, 'message' => 'Staff member deleted']);
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'role' => $user->role,
            'status' => $user->status === 'inactive' ? 'inactive' : 'active',
            'employee_id' => $user->employee_id,
            'date_of_birth' => optional($user->date_of_birth)->format('Y-m-d'),
            'gender' => $user->gender,
            'city' => $user->city,
            'state' => $user->state,
            'pincode' => $user->pincode,
            'joining_date' => optional($user->joining_date)->format('Y-m-d'),
            'designation_id' => $user->designation_id,
            'department_id' => $user->department_id,
            'designation_name' => $user->relationLoaded('designation') ? $user->designation?->name : null,
            'department_name' => $user->relationLoaded('department') ? $user->department?->name : null,
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
