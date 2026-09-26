<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class QwaService
{
    private const TIMEOUT_SECONDS = 20;

    public function validateApiKey(string $baseUrl, string $apiKey): array
    {
        return $this->request('post', $baseUrl, $apiKey, '/api/auth/validate');
    }

    public function sessionStatus(string $baseUrl, string $apiKey, string $sessionId): array
    {
        return $this->request('get', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId));
    }

    public function startSession(string $baseUrl, string $apiKey, string $sessionId): array
    {
        return $this->request('post', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/start');
    }

    public function sessionQr(string $baseUrl, string $apiKey, string $sessionId): array
    {
        return $this->request('get', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/qr');
    }

    public function sendTextMessage(string $baseUrl, string $apiKey, string $sessionId, string $chatId, string $text): array
    {
        return $this->request('post', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/messages/send-text', [
            'chatId' => $chatId,
            'text' => $text,
        ]);
    }

    public function listTemplates(string $baseUrl, string $apiKey, string $sessionId): array
    {
        return $this->request('get', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/templates');
    }

    /**
     * Push a locally authored (custom) template to QWA so it is stored on the
     * gateway and available through the send-template endpoint.
     */
    public function createTemplate(string $baseUrl, string $apiKey, string $sessionId, array $payload): array
    {
        return $this->request('post', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/templates', $payload);
    }

    /**
     * Push the latest local content of an already-created template to QWA.
     */
    public function updateTemplate(string $baseUrl, string $apiKey, string $sessionId, string $templateId, array $payload): array
    {
        return $this->request('put', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/templates/' . rawurlencode($templateId), $payload);
    }

    public function sendTemplate(string $baseUrl, string $apiKey, string $sessionId, string $chatId, string $templateId, array $vars): array
    {
        $payload = [
            'chatId' => $chatId,
            'templateId' => $templateId,
        ];

        if ($vars !== []) {
            $payload['vars'] = $vars;
        }

        return $this->request('post', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/messages/send-template', $payload);
    }

    public function sendMedia(string $mediaType, string $baseUrl, string $apiKey, string $sessionId, array $payload): array
    {
        $endpoint = in_array($mediaType, ['image', 'audio', 'document', 'video', 'sticker'], true)
            ? $mediaType
            : 'document';

        return $this->request('post', $baseUrl, $apiKey, '/api/sessions/' . rawurlencode($sessionId) . '/messages/send-' . $endpoint, $payload);
    }

    private function request(string $method, string $baseUrl, string $apiKey, string $path, array $data = []): array
    {
        try {
            $pending = Http::asJson()
                ->acceptJson()
                ->timeout(self::TIMEOUT_SECONDS)
                ->withHeaders(['X-API-Key' => $apiKey]);

            $response = match ($method) {
                'get' => $pending->get($this->normalizeBaseUrl($baseUrl) . $path),
                'put' => $pending->put($this->normalizeBaseUrl($baseUrl) . $path, $data),
                default => $pending->post($this->normalizeBaseUrl($baseUrl) . $path, $data),
            };
        } catch (ConnectionException $exception) {
            return $this->result(false, 503, 'Unable to reach the QWA server.', null, $exception->getMessage());
        }

        return $this->result(
            $response->successful(),
            $response->status(),
            $this->messageFrom($response),
            $response->json()
        );
    }

    private function normalizeBaseUrl(string $baseUrl): string
    {
        return rtrim(trim($baseUrl), '/');
    }

    private function messageFrom(Response $response): string
    {
        $body = $response->json();

        if (is_array($body)) {
            return $body['message']
                ?? $body['error']
                ?? $body['statusMessage']
                ?? ($response->successful() ? 'QWA request completed successfully.' : 'QWA request failed.');
        }

        return $response->successful() ? 'QWA request completed successfully.' : 'QWA request failed.';
    }

    private function result(bool $success, int $statusCode, string $message, $body = null, ?string $error = null): array
    {
        return [
            'success' => $success,
            'statusCode' => $statusCode,
            'message' => $message,
            'body' => $body,
            'error' => $error,
        ];
    }
}
