<?php

namespace App\Http\Controllers;

use App\Models\SuperAdminSetting;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Response;

class PasswordResetController extends Controller
{
    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
    }

    public function create(): Response|RedirectResponse
    {
        if (auth()->check()) {
            return redirect($this->staffPermissionService->landingPathFor(auth()->user()));
        }

        return inertia('ForgotPasswordPage');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $this->applyStoredSmtpSettings();

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('success', __($status));
        }

        return back()->withErrors([
            'email' => __($status),
        ]);
    }

    public function edit(Request $request, string $token): Response|RedirectResponse
    {
        if (auth()->check()) {
            return redirect($this->staffPermissionService->landingPathFor(auth()->user()));
        }

        return inertia('ResetPasswordPage', [
            'token' => $token,
            'email' => $request->string('email')->toString(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect()
                ->route('login')
                ->with('success', 'Your password has been reset. Please sign in with your new password.');
        }

        return back()->withErrors([
            'email' => __($status),
        ]);
    }

    private function applyStoredSmtpSettings(): void
    {
        if (!Schema::hasTable('super_admin_settings')) {
            return;
        }

        $settings = SuperAdminSetting::query()->first();

        if (!$settings || !$settings->is_active) {
            return;
        }

        Config::set('mail.default', $settings->mailer);
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $settings->smtp_host);
        Config::set('mail.mailers.smtp.port', $settings->smtp_port);
        Config::set('mail.mailers.smtp.username', $settings->smtp_username);
        Config::set('mail.mailers.smtp.password', $settings->smtp_password);
        Config::set('mail.mailers.smtp.encryption', $settings->smtp_encryption);
        Config::set('mail.from.address', $settings->from_email);
        Config::set('mail.from.name', $settings->from_name);

        if ($settings->reply_to_email) {
            Config::set('mail.reply_to.address', $settings->reply_to_email);
            Config::set('mail.reply_to.name', $settings->from_name);
        }
    }
}
