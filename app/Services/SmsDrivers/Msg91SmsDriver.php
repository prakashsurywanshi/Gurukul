<?php

namespace App\Services\SmsDrivers;

use App\Contracts\SmsDriver;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class Msg91SmsDriver implements SmsDriver
{
    private const SEND_ENDPOINT = 'https://control.msg91.com/api/sendhttp.php';

    public function name(): string
    {
        return 'MSG91';
    }

    public function send(array $config): array
    {
        $phone = (string) ($config['phone'] ?? '');
        $message = (string) ($config['message'] ?? '');

        if ($phone === '' || $message === '') {
            return $this->result(false, 422, 'Phone number and message are required.', null, null);
        }

        $apiKey = (string) ($config['apiKey'] ?? '');
        $senderId = (string) ($config['senderId'] ?? '');

        if ($apiKey === '') {
            return $this->result(false, 422, 'MSG91 auth key is not configured.', null, null);
        }

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(20)
                ->post(self::SEND_ENDPOINT, [
                    'authkey' => $apiKey,
                    'mobiles' => $phone,
                    'message' => $message,
                    'sender' => $senderId ?: 'GURUKL',
                    'route' => '4',
                    'country' => '91',
                ]);
        } catch (ConnectionException $exception) {
            return $this->result(false, 503, 'Unable to reach the MSG91 gateway.', null, $exception->getMessage());
        }

        $body = trim($response->body());
        $isError = str_contains(strtolower($body), 'error')
            || str_starts_with(strtolower($body), 'please')
            || ! $response->successful();

        return $this->result(
            $response->successful() && ! $isError,
            $response->status(),
            $isError ? ($body ?: 'MSG91 request failed.') : 'SMS sent successfully.',
            $body !== '' ? ['raw' => $body] : null,
            $response->successful() && ! $isError ? $body : null
        );
    }

    /**
     * @return array{success: bool, status: int, body: mixed, message: string, reference: ?string}
     */
    private function result(bool $success, int $status, string $message, mixed $body, ?string $reference): array
    {
        return [
            'success' => $success,
            'status' => $status,
            'body' => $body,
            'message' => $message,
            'reference' => $reference,
        ];
    }
}