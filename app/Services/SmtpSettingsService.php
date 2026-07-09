<?php

namespace App\Services;

use App\Models\SuperAdminSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Schema;

class SmtpSettingsService
{
    public function getActiveSettings(): ?SuperAdminSetting
    {
        if (! Schema::hasTable('super_admin_settings')) {
            return null;
        }

        $settings = SuperAdminSetting::query()->first();

        if (! $settings || ! $settings->is_active) {
            return null;
        }

        return $settings;
    }

    public function applyActiveSettings(): ?SuperAdminSetting
    {
        $settings = $this->getActiveSettings();

        if (! $settings) {
            return null;
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
            Config::set('mail.reply_to.name', $settings->from_name ?: 'Gurukul ERP');
        }

        return $settings;
    }
}
