<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserDeviceToken;
use App\Services\StaffPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly StaffPermissionService $staffPermissionService
    ) {
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'fcm_token' => 'nullable|string|max:2048',
            'device_platform' => 'nullable|in:android,ios,web,unknown',
            'device_name' => 'nullable|string|max:255',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        if ($user->status === 'inactive') {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact administrator.'],
            ]);
        }

        if ($user->status === 'suspended') {
            throw ValidationException::withMessages([
                'email' => ['Your account is suspended. Please contact administrator.'],
            ]);
        }

        if ($user->organization_id && $user->role !== 'super_admin') {
            $organization = Organization::query()->find($user->organization_id);
            if ($organization && !$organization->hasActiveAccess()) {
                $message = $organization->accessRestrictionMessage() ?? 'Your organization account is currently unavailable.';
                throw ValidationException::withMessages([
                    'email' => [$message],
                ]);
            }
        }

        $token = $user->createToken('flutter-gurukul-' . now()->timestamp)->plainTextToken;
        $this->storeDeviceTokenForUser($user, $request);

        return response()->json([
            'message' => 'Login successful',
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:super_admin,admin,receptionist,teacher,accountant,librarian,student,parent',
            'fcm_token' => 'nullable|string|max:2048',
            'device_platform' => 'nullable|in:android,ios,web,unknown',
            'device_name' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'role' => $request->role,
            'status' => 'active',
        ]);

        $token = $user->createToken('flutter-gurukul-' . now()->timestamp)->plainTextToken;
        $this->storeDeviceTokenForUser($user, $request);

        return response()->json([
            'message' => 'Registration successful',
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->filled('fcm_token')) {
            UserDeviceToken::query()
                ->where('user_id', $request->user()->id)
                ->where('token', $request->string('fcm_token')->toString())
                ->delete();
        }

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUserResponse($request->user()),
            'permissions' => $this->staffPermissionService->featurePermissionsFor($request->user()),
        ]);
    }

    public function permissions(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'permissions' => $this->staffPermissionService->featurePermissionsFor($request->user()),
        ]);
    }

    public function subscriptionStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->organization_id || $user->role === 'super_admin') {
            return response()->json([
                'subscription_expired' => false,
                'message' => null,
            ]);
        }

        $organization = Organization::query()->find($user->organization_id);

        if (!$organization) {
            return response()->json([
                'subscription_expired' => false,
                'message' => null,
            ]);
        }

        if (!$organization->hasActiveAccess()) {
            $message = $organization->accessRestrictionMessage() ?? 'Your organization account is currently unavailable.';

            return response()->json([
                'subscription_expired' => true,
                'message' => $message,
                'expired_on' => $organization->subscription_end_date?->format('d M Y'),
            ]);
        }

        return response()->json([
            'subscription_expired' => false,
            'message' => null,
            'warning' => $organization->expiryWarningMessage(),
        ]);
    }

    public function registerDeviceToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:2048',
            'platform' => 'nullable|in:android,ios,web,unknown',
            'device_name' => 'nullable|string|max:255',
        ]);

        UserDeviceToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $request->user()->id,
                'organization_id' => $request->user()->organization_id,
                'platform' => $validated['platform'] ?? 'unknown',
                'device_name' => $validated['device_name'] ?? null,
                'last_used_at' => now(),
            ],
        );

        return response()->json([
            'message' => 'Device token registered successfully.',
        ]);
    }

    public function unregisterDeviceToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:2048',
        ]);

        UserDeviceToken::query()
            ->where('user_id', $request->user()->id)
            ->where('token', $validated['token'])
            ->delete();

        return response()->json([
            'message' => 'Device token removed successfully.',
        ]);
    }

    private function formatUserResponse(User $user): array
    {
        $organization = $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
        $currentSession = $organization?->selectedSessionName();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,
            'organization_id' => $user->organization_id,
            'address' => $user->address,
            'profile_photo' => $user->profile_photo,
            'email_verified_at' => $user->email_verified_at,
            'current_session' => $currentSession,
        ];
    }

    private function storeDeviceTokenForUser(User $user, Request $request): void
    {
        if (! $request->filled('fcm_token')) {
            return;
        }

        UserDeviceToken::updateOrCreate(
            ['token' => $request->string('fcm_token')->toString()],
            [
                'user_id' => $user->id,
                'organization_id' => $user->organization_id,
                'platform' => $request->input('device_platform', 'unknown'),
                'device_name' => $request->input('device_name'),
                'last_used_at' => now(),
            ],
        );
    }
}
