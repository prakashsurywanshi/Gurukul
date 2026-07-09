<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class WhatsappBridgeService
{
    public function isConfigured(): bool
    {
        return filled($this->baseUrl());
    }

    public function status(?string $session = null): array
    {
        return $this->request('get', '/status', $session);
    }

    public function qr(?string $session = null): array
    {
        return $this->request('get', '/qr', $session);
    }

    public function logout(?string $session = null): array
    {
        return $this->request('post', '/logout', $session, []);
    }

    public function send(?string $session = null, string $phone, string $message): array
    {
        $payloadCandidates = [
            [
                'to' => $phone,
                'message' => $message,
            ],
            [
                'number' => $phone,
                'message' => $message,
            ],
            [
                'phone' => $phone,
                'text' => $message,
            ],
            [
                'jid' => $phone . '@s.whatsapp.net',
                'message' => $message,
            ],
        ];

        $lastResult = null;

        foreach ($payloadCandidates as $payload) {
            $result = $this->request('post', '/send', $session, $payload);
            $lastResult = $result;

            if ($result['success']) {
                return $result;
            }

            if (($result['statusCode'] ?? 0) === 409) {
                return $result;
            }
        }

        return $lastResult ?? [
            'success' => false,
            'statusCode' => 500,
            'body' => null,
            'message' => 'WhatsApp bridge request failed.',
            'session' => $session,
            'account' => null,
            'status' => null,
        ];
    }

    private function request(string $method, string $path, ?string $session = null, array $payload = []): array
    {
        if (! $this->isConfigured()) {
            return [
                'success' => false,
                'statusCode' => 500,
                'body' => null,
                'message' => 'WhatsApp bridge URL is not configured.',
                'session' => $session,
                'account' => null,
                'status' => null,
            ];
        }

        try {
            $request = $this->baseRequest($session);
            $response = $method === 'get'
                ? $request->get($this->baseUrl() . $path)
                : $request->post($this->baseUrl() . $path, $payload);
        } catch (ConnectionException $exception) {
            return [
                'success' => false,
                'statusCode' => 503,
                'body' => null,
                'message' => 'Unable to reach the WhatsApp bridge.',
                'session' => $session,
                'account' => null,
                'status' => null,
                'error' => $exception->getMessage(),
            ];
        }

        return $this->normalizeResponse($response, $session);
    }

    private function baseRequest(?string $session = null): PendingRequest
    {
        $request = Http::asJson()
            ->acceptJson()
            ->timeout(20);

        if (filled($session)) {
            $request = $request->withHeaders([
                'Cookie' => 'wa_bridge_session=' . $session,
            ]);
        }

        return $request;
    }

    private function normalizeResponse(Response $response, ?string $fallbackSession = null): array
    {
        $body = $response->json();

        if (! is_array($body)) {
            $body = ['raw' => $response->body()];
        }

        return [
            'success' => $response->successful(),
            'statusCode' => $response->status(),
            'body' => $body,
            'message' => $body['message']
                ?? $body['error']
                ?? ($response->successful() ? 'WhatsApp bridge request completed successfully.' : 'WhatsApp bridge request failed.'),
            'session' => $this->extractSession($response, $body, $fallbackSession),
            'account' => $body['account'] ?? null,
            'status' => $body['status'] ?? null,
        ];
    }

    private function extractSession(Response $response, array $body, ?string $fallbackSession = null): ?string
    {
        $setCookie = (string) ($response->header('Set-Cookie') ?? '');

        if (preg_match('/wa_bridge_session=([^;]+)/', $setCookie, $matches) === 1) {
            return $matches[1];
        }

        if (filled($body['session'] ?? null)) {
            return (string) $body['session'];
        }

        return $fallbackSession;
    }

    private function baseUrl(): ?string
    {
        $value = config('services.whatsapp_bridge.url');

        return filled($value) ? rtrim((string) $value, '/') : null;
    }
}
