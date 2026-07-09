<?php

namespace App\Providers;

use App\Services\SmtpSettingsService;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->applyStoredSmtpSettings();
    }

    private function applyStoredSmtpSettings(): void
    {
        try {
            app(SmtpSettingsService::class)->applyActiveSettings();
        } catch (Throwable) {
            // Fall back to default mail config when the settings table or database is unavailable.
        }
    }
}
