<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class SsoController extends Controller
{
    private const PROVIDERS = ['google', 'facebook', 'github'];

    public function status(): array
    {
        return [
            'enabled' => $this->enabled(),
            'providers' => $this->providers(),
            'installed' => class_exists(Socialite::class),
        ];
    }

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        if (!$this->enabled() || !in_array($provider, $this->providers(), true)) {
            return redirect()->route('login')->withErrors(['email' => 'SSO is not enabled for this provider.']);
        }

        return Socialite::driver($provider)->redirect();
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        if (!$this->enabled() || !in_array($provider, $this->providers(), true)) {
            return redirect()->route('login')->withErrors(['email' => 'SSO is not enabled for this provider.']);
        }

        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (Throwable) {
            return redirect()->route('login')->withErrors(['email' => 'Unable to sign in with ' . $provider . '.']);
        }

        $email = strtolower((string) ($socialUser->getEmail() ?? ''));

        if (!$email) {
            return redirect()->route('login')->withErrors(['email' => 'SSO account has no verified email address.']);
        }

        $name = $socialUser->getName() ?: $socialUser->getNickname() ?: $provider;

        $user = User::query()->where('email', $email)->first();

        if (!$user) {
            $organization = Organization::query()->first();
            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Str::password(32),
                    'role' => 'parent',
                    'organization_id' => $organization?->id,
                    'status' => 'active',
                ],
            );
        }

        $user->update([
            'sso_provider' => $provider,
            'sso_avatar' => $socialUser->getAvatar(),
        ]);

        Auth::login($user, true);

        return redirect()->route('dashboard');
    }

    private function enabled(): bool
    {
        return (bool) env('SSO_ENABLED', false);
    }

    private function providers(): array
    {
        return array_values(array_filter(self::PROVIDERS, function (string $provider) {
            return config("services.{$provider}.client_id") && config("services.{$provider}.client_secret");
        }));
    }
}