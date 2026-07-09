<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class SmartfloService
{
    private const CLICK_TO_CALL_SUPPORT_ENDPOINT = 'https://api-smartflo.tatateleservices.com/v1/click_to_call_support';

    public function initiateClickToCallSupport(array $payload): array
    {
        $response = Http::asJson()
            ->acceptJson()
            ->timeout(20)
            ->post(self::CLICK_TO_CALL_SUPPORT_ENDPOINT, [
                'customer_number' => $payload['customer_number'],
                'caller_id' => $payload['caller_id'],
                'api_key' => $payload['api_key'],
                'async' => 1,
                'customer_ring_timeout' => $payload['customer_ring_timeout'] ?? 30,
                'call_timeout' => $payload['call_timeout'] ?? 60,
                'custom_identifier' => $payload['custom_identifier'] ?? null,
            ]);

        return $this->normalizeResponse($response);
    }

    private function normalizeResponse(Response $response): array
    {
        $body = $response->json();

        if (! is_array($body)) {
            $body = ['raw' => $response->body()];
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'body' => $body,
            'message' => $body['message']
                ?? $body['msg']
                ?? $body['error']
                ?? ($response->successful() ? 'Smartflo call initiated successfully.' : 'Smartflo request failed.'),
            'reference' => $body['request_id']
                ?? $body['call_id']
                ?? $body['id']
                ?? $body['data']['request_id']
                ?? null,
        ];
    }
}
