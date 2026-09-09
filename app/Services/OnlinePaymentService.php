<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Throwable;

class OnlinePaymentService
{
    public const SETTINGS_KEY = 'online_payment';

    public static function settings(?Organization $organization): array
    {
        return array_merge([
            'enabled' => false,
            'razorpay_enabled' => true,
            'razorpay_key_id' => '',
            'razorpay_key_secret' => '',
            'razorpay_currency' => 'INR',
            'upi_enabled' => true,
            'upi_id' => '',
            'upi_holder_name' => '',
        ], (array) ($organization?->settings[self::SETTINGS_KEY] ?? []));
    }

    public static function isRazorpayConfigured(?Organization $organization): bool
    {
        $settings = self::settings($organization);

        return (bool) ($settings['enabled'] ?? false)
            && (bool) ($settings['razorpay_enabled'] ?? false)
            && $settings['razorpay_key_id'] !== ''
            && $settings['razorpay_key_secret'] !== '';
    }

    public static function isUpiConfigured(?Organization $organization): bool
    {
        $settings = self::settings($organization);

        return (bool) ($settings['enabled'] ?? false)
            && (bool) ($settings['upi_enabled'] ?? false)
            && $settings['upi_id'] !== ''
            && $settings['upi_holder_name'] !== '';
    }

    public static function razorpayMode(?Organization $organization): ?string
    {
        $keyId = (string) (self::settings($organization)['razorpay_key_id'] ?? '');

        if ($keyId === '') {
            return null;
        }

        if (str_starts_with($keyId, 'rzp_test_')) {
            return 'test';
        }

        if (str_starts_with($keyId, 'rzp_live_')) {
            return 'live';
        }

        return 'custom';
    }

    public static function isAvailable(?Organization $organization, string $mode): bool
    {
        $settings = self::settings($organization);

        if (! (bool) ($settings['enabled'] ?? false)) {
            return false;
        }

        if ($mode === 'razorpay') {
            return (bool) ($settings['razorpay_enabled'] ?? false)
                && $settings['razorpay_key_id'] !== ''
                && $settings['razorpay_key_secret'] !== '';
        }

        if ($mode === 'upi') {
            return (bool) ($settings['upi_enabled'] ?? false)
                && $settings['upi_id'] !== ''
                && $settings['upi_holder_name'] !== '';
        }

        return false;
    }

    public function createRazorpayOrder(Organization $organization, float $amountInPaise, string $receipt): array
    {
        $settings = self::settings($organization);

        $response = Http::withBasicAuth($settings['razorpay_key_id'], $this->decryptKey($settings['razorpay_key_secret']))
            ->asJson()
            ->acceptJson()
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => (int) round($amountInPaise),
                'currency' => $settings['razorpay_currency'] ?? 'INR',
                'receipt' => $receipt,
                'payment_capture' => 1,
            ]);

        if ($response->failed()) {
            throw new ConnectionException('Razorpay order creation failed: '.$response->body());
        }

        return $response->json();
    }

    public function verifySignature(string $orderId, string $paymentId, string $signature, Organization $organization): bool
    {
        $settings = self::settings($organization);
        $expected = hash_hmac('sha256', $orderId.'|'.$paymentId, $this->decryptKey($settings['razorpay_key_secret']));

        return hash_equals($expected, $signature);
    }

    public static function upiPayload(string $vpa, string $holderName, float $amount, string $note): string
    {
        return 'upi://pay?'
            .http_build_query([
                'pa' => $vpa,
                'pn' => $holderName,
                'am' => number_format($amount, 2, '.', ''),
                'cu' => 'INR',
                'tn' => $note,
            ]);
    }

    private function decryptKey(string $secret): string
    {
        try {
            $decrypted = decrypt($secret);

            return is_string($decrypted) ? $decrypted : $secret;
        } catch (Throwable) {
            return $secret;
        }
    }
}