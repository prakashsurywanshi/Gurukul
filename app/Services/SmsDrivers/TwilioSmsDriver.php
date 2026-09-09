<?php

namespace App\Services\SmsDrivers;

use App\Contracts\SmsDriver;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class TwilioSmsDriver implements SmsDriver
{
    private const MESSAGES_ENDPOINT = 'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json';

    public function name(): string
    {
        return 'Twilio';
    }

    public function send(array $config): array
    {
        $phone = (string) ($config['phone'] ?? '');
        $message = (string) ($config['message'] ?? '');

        if ($phone === '' || $message === '') {
            return $this->result(false, 422, 'Phone number and message are required.', null, null);
        }

        $accountSid = (string) ($config['accountSid'] ?? '');
        $apiKey = (string) ($config['apiKey'] ?? '');
        $from = (string) ($config['senderId'] ?? '');

        if ($accountSid === '' || $apiKey === '' || $from === '') {
            return $this->result(false, 422, 'Twilio account SID, auth token, and from number are required.', null, null);
        }

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->timeout(20)
                ->withBasicAuth($accountSid, $apiKey)
                ->post(sprintf(self::MESSAGES_ENDPOINT, $accountSid), [
                    'To' => $phone,
                    'From' => $from,
                    'Body' => $message,
                ]);
        } catch (ConnectionException $exception) {
            return $this->result(false, 503, 'Unable to reach the Twilio gateway.', null, $exception->getMessage());
        }

        $body = $response->json() ?? ['raw' => $response->body()];
        $sid = is_array($body) ? ($body['sid'] ?? ($body['code'] ?? null)) : null;
        $errorMessage = is_array($body)
            ? ($body['message'] ?? ($response->successful() ? 'SMS sent successfully.' : 'Twilio request failed.'))
            : ($response->successful() ? 'SMS sent successfully.' : 'Twilio request failed.');

        return $this->result(
            $response->successful() && ! ($body['code'] ?? null),
            $response->status(),
            $errorMessage,
            $body,
            is_string($sid) ? $sid : null
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