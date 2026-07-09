<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StaffPermissionService;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionApiController extends Controller
{
    public function __construct(
        private readonly StaffPermissionService $staffPermissionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->staffPermissionService->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization found'], 404);
        }

        $roles = $this->staffPermissionService->roleRecords($organization);
        $permissions = $this->staffPermissionService->buildRolePermissionsPayload($organization);

        return response()->json([
            'success' => true,
            'roles' => $roles,
            'permissions' => $permissions,
            'features' => RolePermissionCatalog::features(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->staffPermissionService->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization found'], 404);
        }

        $rolePermissions = $request->input('role_permissions', []);

        if (!is_array($rolePermissions) || empty($rolePermissions)) {
            return response()->json(['success' => false, 'message' => 'No permissions data provided'], 422);
        }

        $normalized = $this->staffPermissionService->normalizeRolePermissions($organization, $rolePermissions);
        $this->staffPermissionService->syncPermissions($organization, $normalized);

        return response()->json([
            'success' => true,
            'message' => 'Permissions updated successfully',
        ]);
    }
}
