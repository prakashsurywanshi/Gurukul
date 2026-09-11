<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiProviderClient
{
    private string $baseUrl;

    private ?string $apiKey;

    private string $model;

    private float $temperature;

    private int $timeout;

    private string $mode;

    public function __construct(array $config = [])
    {
        $this->mode = (string) ($config['mode'] ?? env('AI_MODE', 'openai'));
        $this->baseUrl = rtrim((string) ($config['base_url'] ?? env('AI_BASE_URL', 'https://api.openai.com/v1')), '/');
        $this->apiKey = filled($config['api_key'] ?? null)
            ? (string) $config['api_key']
            : (env('AI_API_KEY') ?: null);
        $this->model = (string) ($config['model'] ?? env('AI_MODEL', 'gpt-4o-mini'));
        $this->temperature = (float) ($config['temperature'] ?? 0.3);
        $this->timeout = (int) ($config['timeout'] ?? 60);
    }

    public function complete(string $system, string $user): string
    {
        if (empty($this->apiKey) && $this->mode !== 'local') {
            throw new RuntimeException('AI provider is not configured. Set AI_API_KEY or configure the AI settings.');
        }

        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ],
            'temperature' => $this->temperature,
            'max_tokens' => 900,
        ];

        $request = Http::acceptJson()->timeout($this->timeout);

        if ($this->apiKey) {
            $request = $request->withToken($this->apiKey);
        }

        $response = $request->post($this->baseUrl . '/chat/completions', $payload);

        if ($response->failed()) {
            throw new RuntimeException('AI provider request failed with status ' . $response->status() . '.');
        }

        $content = data_get($response->json(), 'choices.0.message.content');

        if (!$content) {
            throw new RuntimeException('AI provider returned an empty completion.');
        }

        return trim((string) $content);
    }

    public function completeVision(string $system, string $user, string $imageDataUrl): string
    {
        if ($this->mode === 'local') {
            return 'Vision is not available in local mode. Configure an OpenAI-compatible AI provider to enable facial detection previews.';
        }

        if (empty($this->apiKey)) {
            throw new RuntimeException('AI provider is not configured. Set AI_API_KEY or configure the AI settings.');
        }

        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $user],
                        ['type' => 'image_url', 'image_url' => ['url' => $imageDataUrl]],
                    ],
                ],
            ],
            'temperature' => $this->temperature,
            'max_tokens' => 900,
        ];

        $request = Http::acceptJson()->timeout($this->timeout);

        if ($this->apiKey) {
            $request = $request->withToken($this->apiKey);
        }

        $response = $request->post($this->baseUrl . '/chat/completions', $payload);

        if ($response->failed()) {
            throw new RuntimeException('AI vision request failed with status ' . $response->status() . '.');
        }

        $content = data_get($response->json(), 'choices.0.message.content');

        if (!$content) {
            throw new RuntimeException('AI provider returned an empty vision completion.');
        }

        return trim((string) $content);
    }
}