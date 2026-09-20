<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\Ai\AiContextService;
use App\Services\Ai\AiProviderClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class AiAssistantController extends Controller
{
    private const AI_DEFAULTS = [
        'mode' => 'openai',
        'base_url' => '',
        'model' => '',
        'api_key' => '',
        'temperature' => 0.3,
        'timeout' => 60,
    ];

    public function __construct(
        private readonly AiContextService $contextService
    ) {
    }

    public function index()
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $config = $this->aiConfig($organization);
        $settings = is_array($organization->settings) ? $organization->settings : [];

        return inertia('dashboard/AiAssistant', [
            'user' => $user,
            'organization' => ['id' => $organization->id, 'name' => $organization->name],
            'enabled' => (bool) ($settings['ai_assistant_enabled'] ?? false),
            'config' => $config['visible'],
            'configured' => $config['configured'],
            'canManage' => in_array($user->role, ['super_admin', 'admin'], true),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['super_admin', 'admin'], true), 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $newKey = trim((string) $request->input('api_key', ''));
        $hasSavedKey = !empty($saved['api_key'] ?? '') || filled(config('ai.api_key'));

        $settings['ai_assistant_enabled'] = $request->boolean('enabled');
        $settings['ai'] = [
            'mode' => $request->input('mode', $saved['mode'] ?? config('ai.mode')),
            'base_url' => trim((string) $request->input('base_url', $saved['base_url'] ?? config('ai.base_url'))),
            'model' => trim((string) $request->input('model', $saved['model'] ?? config('ai.model'))),
            'api_key' => $newKey !== '' ? $newKey : ($saved['api_key'] ?? ''),
            'temperature' => (float) $request->input('temperature', $saved['temperature'] ?? 0.3),
            'timeout' => (int) $request->input('timeout', $saved['timeout'] ?? 60),
        ];

        $organization->settings = $settings;
        $organization->save();

        return back()->with('success', 'AI assistant settings updated.');
    }

    public function ask(Request $request): JsonResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = is_array($organization->settings) ? $organization->settings : [];

        if (!(bool) ($settings['ai_assistant_enabled'] ?? false)) {
            return response()->json(['error' => 'AI assistant is disabled.'], 403);
        }

        $validated = $request->validate([
            'question' => ['required', 'string', 'max:4000'],
        ]);

        $config = $this->aiConfig($organization);

        try {
            $client = new AiProviderClient([
                'mode' => $config['resolved']['mode'],
                'base_url' => $config['resolved']['base_url'],
                'api_key' => $config['resolved']['api_key'],
                'model' => $config['resolved']['model'],
                'temperature' => $config['resolved']['temperature'],
                'timeout' => $config['resolved']['timeout'],
            ]);

            $reply = $client->complete($this->contextService->systemPrompt($organization), $validated['question']);

            return response()->json([
                'ok' => true,
                'reply' => $reply,
                'model' => $config['resolved']['model'],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $this->friendlyError($e),
            ], 502);
        }
    }

    private function aiConfig(Organization $organization): array
    {
        $settings = is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $mode = $saved['mode'] ?? config('ai.mode');
        $baseUrl = ($saved['base_url'] ?? '') ?: (config('ai.base_url') ?: config('ai.default_base_url'));
        $model = ($saved['model'] ?? '') ?: (config('ai.model') ?: config('ai.default_model'));
        $apiKey = !empty($saved['api_key'] ?? '') ? $saved['api_key'] : (config('ai.api_key') ?: '');
        $temperature = (float) ($saved['temperature'] ?? 0.3);
        $timeout = (int) ($saved['timeout'] ?? 60);

        return [
            'visible' => [
                'mode' => $mode,
                'base_url' => $saved['base_url'] ?? config('ai.base_url'),
                'model' => $model,
                'temperature' => $temperature,
                'timeout' => $timeout,
                // Never expose the stored key to the browser; show masked state only.
                'has_api_key' => !empty($apiKey),
            ],
            'configured' => $mode === 'local' || !empty($apiKey),
            'resolved' => [
                'mode' => $mode,
                'base_url' => $baseUrl,
                'model' => $model,
                'api_key' => $apiKey,
                'temperature' => $temperature,
                'timeout' => $timeout,
            ],
        ];
    }

    private function friendlyError(Throwable $e): string
    {
        $message = $e->getMessage();

        if (str_contains($message, 'not configured')) {
            return 'AI provider is not configured. An administrator must configure the AI settings first.';
        }

        return 'The AI assistant could not reach the provider right now. Please try again later.';
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}