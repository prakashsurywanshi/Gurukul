<?php

namespace App\Services;

use App\Contracts\SmsDriver;
use App\Services\SmsDrivers\Msg91SmsDriver;
use App\Services\SmsDrivers\TwilioSmsDriver;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class SmsService
{
    /** @var array<string, SmsDriver> */
    private array $drivers = [];

    public function __construct(?Msg91SmsDriver $msg91 = null, ?TwilioSmsDriver $twilio = null)
    {
        $this->drivers = [
            'MSG91' => $msg91 ?? new Msg91SmsDriver(),
            'Twilio' => $twilio ?? new TwilioSmsDriver(),
        ];
    }

    /**
     * @return list<string>
     */
    public function availableProviders(): array
    {
        return array_keys($this->drivers);
    }

    /**
     * @param  array<string, mixed>  $smsSettings
     */
    public function driverFor(array $smsSettings): ?SmsDriver
    {
        $provider = (string) ($smsSettings['provider'] ?? '');

        if ($provider === '' || ! isset($this->drivers[$provider])) {
            return null;
        }

        return $this->drivers[$provider];
    }

    /**
     * @param  array<string, mixed>  $smsSettings
     */
    public function isConfigured(array $smsSettings): bool
    {
        if (empty($smsSettings['enabled'])) {
            return false;
        }

        $driver = $this->driverFor($smsSettings);
        $apiKey = $this->decryptKey((string) ($smsSettings['apiKey'] ?? ''));

        if (! $driver || $apiKey === '') {
            return false;
        }

        if ($driver->name() === 'Twilio' && (string) ($smsSettings['accountSid'] ?? '') === '') {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $smsSettings
     * @return array{success: bool, status: int, body: mixed, message: string, reference: ?string, provider: string}
     */
    public function send(array $smsSettings, string $phone, string $message): array
    {
        $driver = $this->driverFor($smsSettings);

        if (! $driver) {
            return [
                'success' => false,
                'status' => 422,
                'body' => null,
                'message' => sprintf('SMS provider "%s" is not supported.', (string) ($smsSettings['provider'] ?? '')),
                'reference' => null,
                'provider' => (string) ($smsSettings['provider'] ?? ''),
            ];
        }

        $result = $driver->send([
            'phone' => $phone,
            'message' => $message,
            'senderId' => (string) ($smsSettings['senderId'] ?? ''),
            'apiKey' => $this->decryptKey((string) ($smsSettings['apiKey'] ?? '')),
            'accountSid' => (string) ($smsSettings['accountSid'] ?? ''),
        ]);

        return [
            ...$result,
            'provider' => $driver->name(),
        ];
    }

    /**
     * @param  array<string, mixed>  $smsSettings
     */
    public function decryptKey(string $value): string
    {
        if ($value === '') {
            return '';
        }

        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            return $value;
        }
    }
}