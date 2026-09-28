<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\VerifyNewEmailOtpNotification;
use App\Services\LeaveBalanceService;
use App\Support\RolePermissionCatalog;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    private const EMAIL_OTP_CACHE_PREFIX = 'profile_email_otp:';
    public function __construct(private readonly LeaveBalanceService $leaveBalanceService)
    {
    }

    public function index()
    {
        $user = Auth::user();

        if ($user?->role === 'super_admin') {
            return redirect()->route('superadmin.profile');
        }

        return Inertia::render('Profile', [
            'user' => $user,
        ]);
    }

    public function edit()
    {
        if (Auth::user()?->role === 'super_admin') {
            return redirect()->route('superadmin.profile.edit');
        }

        return Inertia::render('EditProfile', [
            'user' => Auth::user(),
        ]);
    }

    public function leaves(): Response
    {
        $user = Auth::user();

        abort_unless($this->isStaffUser($user), 403);

        $organization = $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
        $leaveYear = $this->leaveBalanceService->titledYear(null);

        return Inertia::render('dashboard/MyLeaves', [
            'user' => $user,
            'leaveRequests' => $this->leaveRequestsForUser($user),
            'leaveBalances' => $organization
                ? $this->leaveBalanceService->balancesForStaff($organization, $user->id, $leaveYear)
                : [],
            'leaveYear' => $leaveYear,
        ]);
    }

    public function storeLeave(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($this->isStaffUser($user), 403);

        if (!$user->organization_id) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'leave_type' => ['required', Rule::in(['sick', 'casual', 'vacation', 'emergency', 'other'])],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $fromDate = Carbon::parse($validated['from_date'])->startOfDay();
        $toDate = Carbon::parse($validated['to_date'])->startOfDay();
        $requestedDays = $fromDate->diffInDays($toDate) + 1;

        if (!$this->leaveBalanceService->canTake(
            Organization::query()->findOrFail($user->organization_id),
            $user->id,
            $validated['leave_type'],
            (int) $fromDate->year,
            (float) $requestedDays
        )) {
            return redirect()
                ->back()
                ->with(
                    'error',
                    sprintf(
                        "Insufficient %s leave balance for year %d.",
                        ucfirst($validated['leave_type']),
                        $fromDate->year
                    )
                );
        }

        LeaveRequest::query()->create([
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
            'student_id' => null,
            'leave_type' => $validated['leave_type'],
            'from_date' => $fromDate->toDateString(),
            'to_date' => $toDate->toDateString(),
            'total_days' => $requestedDays,
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return redirect()->route('my-leaves')->with('success', 'Leave request submitted successfully.');
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
                Rule::unique('users', 'pending_email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:1000'],
        ]);

        $newEmail = $validated['email'];
        $emailChanged = $newEmail !== $user->email;

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'pending_email' => $emailChanged ? $newEmail : null,
        ]);

        if ($emailChanged) {
            $user = $user->fresh();
            $this->sendEmailOtp($user, $newEmail);

            return redirect()
                ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
                ->with('success', 'Profile updated. We sent an OTP to your new email address. Verify it before the email change is applied.');
        }

        $user->update([
            'pending_email' => null,
        ]);
        Cache::forget($this->emailOtpCacheKey($user->id));

        return redirect()
            ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
            ->with('success', 'Profile updated successfully.');
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()
            ->route('profile')
            ->with('success', 'Password changed successfully.');
    }

    public function verifyEmailOtp(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'otp' => ['required', 'digits:6'],
        ]);
        $payload = Cache::get($this->emailOtpCacheKey($user->id));

        if (!$user->pending_email || !is_array($payload) || ($payload['email'] ?? null) !== $user->pending_email) {
            return redirect()
                ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
                ->with('error', 'The email OTP is invalid or has expired. Please request a new OTP.');
        }

        if (!hash_equals((string) ($payload['otp'] ?? ''), $validated['otp'])) {
            return redirect()
                ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
                ->withErrors(['otp' => 'The OTP you entered is incorrect.'])
                ->with('error', 'The OTP you entered is incorrect.');
        }

        if (User::query()->where('email', $user->pending_email)->where('id', '!=', $user->id)->exists()) {
            return redirect()
                ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
                ->withErrors(['email' => 'That email address is already in use by another account.'])
                ->with('error', 'That email address is already in use by another account.');
        }

        $user->update([
            'email' => $user->pending_email,
            'pending_email' => null,
            'email_verified_at' => now(),
        ]);
        Cache::forget($this->emailOtpCacheKey($user->id));

        return redirect()
            ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
            ->with('success', 'Your email address has been verified and updated successfully.');
    }

    public function resendEmailOtp(Request $request)
    {
        $user = $request->user();

        if (!$user->pending_email) {
            return redirect()
                ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
                ->with('error', 'There is no pending email change to verify.');
        }

        if (User::query()->where('email', $user->pending_email)->where('id', '!=', $user->id)->exists()) {
            return redirect()
                ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
                ->withErrors(['email' => 'That email address is already in use by another account.'])
                ->with('error', 'That email address is already in use by another account.');
        }

        $this->sendEmailOtp($user, $user->pending_email);

        return redirect()
            ->route($user->role === 'super_admin' ? 'superadmin.profile.edit' : 'profile.edit')
            ->with('success', 'A fresh OTP has been sent to your pending email address.');
    }

    private function sendEmailOtp($user, string $email): void
    {
        $otp = (string) random_int(100000, 999999);

        Cache::put($this->emailOtpCacheKey($user->id), [
            'email' => $email,
            'otp' => $otp,
        ], now()->addMinutes(10));

        Notification::route('mail', $email)
            ->notify(new VerifyNewEmailOtpNotification($user, $email, $otp));
    }

    private function emailOtpCacheKey(int $userId): string
    {
        return self::EMAIL_OTP_CACHE_PREFIX . $userId;
    }

    private function isStaffUser(?User $user): bool
    {
        return $user !== null && in_array($user->role, RolePermissionCatalog::staffRoleSlugs(), true);
    }

    private function leaveRequestsForUser(User $user)
    {
        return LeaveRequest::query()
            ->where('organization_id', $user->organization_id)
            ->where('user_id', $user->id)
            ->whereNull('student_id')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (LeaveRequest $leaveRequest) => [
                'id' => $leaveRequest->id,
                'type' => $leaveRequest->leave_type,
                'fromDate' => optional($leaveRequest->from_date)->format('Y-m-d'),
                'toDate' => optional($leaveRequest->to_date)->format('Y-m-d'),
                'days' => $leaveRequest->total_days,
                'reason' => $leaveRequest->reason,
                'status' => $leaveRequest->status,
                'appliedOn' => optional($leaveRequest->created_at)->format('Y-m-d'),
                'adminRemarks' => $leaveRequest->admin_remarks,
            ])
            ->values();
    }
}
