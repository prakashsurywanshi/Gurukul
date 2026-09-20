<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricLog;
use App\Models\CctvAccessLog;
use App\Models\CctvCamera;
use App\Models\Organization;
use App\Services\Ai\AiProviderClient;
use App\Services\Ai\FaceCandidateMatcher;
use App\Services\IntegrationKeyService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class CctvIngestionApiController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'service' => 'cctv-face-scan',
            'configured' => $this->anyKeyConfigured(),
            'time' => now()->toIso8601String(),
        ]);
    }

    public function faceScan(Request $request): JsonResponse
    {
        if (!$this->anyKeyConfigured()) {
            return response()->json(['message' => 'CCTV face-scan sync is not configured.'], 503);
        }

        $resolved = $this->resolveKey($request);

        if (!$resolved['authenticated']) {
            return response()->json(['message' => 'Invalid CCTV sync key.'], 401);
        }

        $validated = $request->validate([
            'camera' => ['nullable', 'string', 'max:255'],
            'timestamp' => ['nullable', 'date'],
            'uid' => ['nullable', 'string', 'max:200'],
            'person_meta' => ['nullable', 'array'],
            'image' => ['nullable', 'string', 'max:12000'],
        ]);

        $camera = $this->resolveCamera($resolved['organization_id'], $validated['camera'] ?? null);

        if ($resolved['organization_id'] && !$camera && !empty($validated['camera'])) {
            CctvAccessLog::query()->create($this->logPayload($resolved['organization_id'], null, 'unknown_camera'));
        }

        $eventTime = isset($validated['timestamp'])
            ? Carbon::parse($validated['timestamp'])
            : now();

        $details = [
            'camera' => $camera?->name,
            'location' => $camera?->location,
            'person_meta' => $validated['person_meta'] ?? [],
        ];

        $vision = [
            'requested' => !empty($validated['image']),
            'available' => false,
        ];

        $attributes = ['quality' => 'unknown', 'gender' => 'unknown', 'estimatedAge' => null, 'description' => ''];
        $candidates = [];

        if (!empty($validated['image'])) {
            [$vision, $attributes, $candidates] = $this->analyzeImage($resolved['organization_id'], $validated['image']);
            $details['vision'] = $vision;
            $details['attributes'] = $attributes;
            $details['candidates'] = $candidates;
        }

        $matched = !empty($candidates) && ($candidates[0]['score'] ?? 0) >= 70;

        $log = BiometricLog::query()->create([
            'organization_id' => $resolved['organization_id'],
            'log_type' => 'face',
            'person_type' => $matched ? 'student' : 'unknown',
            'person_name' => $matched ? trim(($candidates[0]['student']['first_name'] ?? '').' '.($candidates[0]['student']['last_name'] ?? '')) : null,
            'uid' => $validated['uid'] ?? null,
            'direction' => null,
            'matched' => $matched,
            'action' => $camera ? 'camera:' . $camera->name : 'camera:unknown',
            'details' => json_encode($details, JSON_UNESCAPED_SLASHES),
            'event_time' => $eventTime,
        ]);

        CctvAccessLog::query()->create($this->logPayload(
            $resolved['organization_id'],
            $camera?->id,
            'face_scan'
        ));

        return response()->json([
            'message' => 'Face scan recorded.',
            'log_id' => (string) $log->id,
            'matched' => $matched,
            'vision' => $vision,
            'attributes' => $attributes,
            'candidates' => $candidates,
            'event_time' => $eventTime->toIso8601String(),
        ], 201);
    }

    private function analyzeImage(int $organizationId, string $dataUrl): array
    {
        $config = $this->aiConfig($organizationId);

        if (!empty($dataUrl) && !$this->configuredForVision($config)) {
            return [[
                'requested' => true,
                'available' => false,
                'reason' => 'not_configured',
            ], [
                'quality' => 'unknown',
                'gender' => 'unknown',
                'estimatedAge' => null,
                'description' => '',
            ], []];
        }

        try {
            $organization = Organization::query()->findOrFail($organizationId);

            $system = 'You are a facial-recognition ingestion assistant for a school ERP. '
                . 'Analyze the supplied photo and respond with STRICT JSON only, no markdown, no prose. '
                . 'JSON schema: {"quality":"good|average|poor","gender":"male|female|unknown","estimatedAge":<int or null>,"description":"<one short sentence>"}. '
                . 'Quality reflects clarity and front-facing posture. If faces are unclear or not a single person, set quality to poor and gender/estimatedAge to unknown.';

            $userPrompt = 'Analyze this captured camera frame for student record matching. Estimated age should be an integer in years, or null when unknowable.';

            $client = new AiProviderClient($config['resolved']);
            $analysis = $client->completeVision($system, $userPrompt, $dataUrl);

            $matcher = app(FaceCandidateMatcher::class);
            $attributes = $matcher->parseAnalysis($analysis);
            $candidates = $matcher->matchCandidates($organization, $attributes);

            return [[
                'requested' => true,
                'available' => true,
            ], $attributes, $candidates];
        } catch (Throwable $e) {
            \Log::warning('CCTV face-scan vision failed', ['error' => $e->getMessage()]);

            return [[
                'requested' => true,
                'available' => false,
                'reason' => 'vision_error',
            ], [
                'quality' => 'unknown',
                'gender' => 'unknown',
                'estimatedAge' => null,
                'description' => '',
            ], []];
        }
    }

    private function configuredForVision(array $config): bool
    {
        return $config['resolved']['mode'] !== 'local' && !empty($config['resolved']['api_key']);
    }

    private function aiConfig(int $organizationId): array
    {
        $organization = Organization::query()->find($organizationId);
        $settings = $organization && is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $mode = $saved['mode'] ?? config('ai.mode');
        $baseUrl = ($saved['base_url'] ?? '') ?: (config('ai.base_url') ?: config('ai.default_base_url'));
        $model = ($saved['model'] ?? '') ?: (config('ai.model') ?: config('ai.default_model'));
        $apiKey = !empty($saved['api_key'] ?? '') ? $saved['api_key'] : (config('ai.api_key') ?: '');

        return [
            'configured' => $mode === 'local' || !empty($apiKey),
            'resolved' => [
                'mode' => $mode,
                'base_url' => $baseUrl,
                'model' => $model,
                'api_key' => $apiKey,
                'temperature' => 0.2,
                'timeout' => 60,
            ],
        ];
    }

    private function resolveCamera(?int $organizationId, ?string $cameraName): ?CctvCamera
    {
        if (blank($cameraName)) {
            return null;
        }

        return CctvCamera::query()
            ->when($organizationId, fn ($query, $orgId) => $query->where('organization_id', $orgId))
            ->where(function ($query) use ($cameraName) {
                $query->where('name', $cameraName)
                    ->orWhere('location', $cameraName);
            })
            ->orderBy('id')
            ->first();
    }

    private function logPayload(int $organizationId, ?int $cameraId, string $action): array
    {
        return [
            'organization_id' => $organizationId,
            'cctv_camera_id' => $cameraId,
            'user_id' => $this->systemUserId(),
            'action' => $action,
            'ip_address' => null,
            'user_agent' => null,
        ];
    }

    private function anyKeyConfigured(): bool
    {
        if (app(IntegrationKeyService::class)->hasGlobalKey('cctv')) {
            return true;
        }

        return Organization::query()
            ->where('settings->cctv->sync_key', '!=', '')
            ->exists();
    }

    private function resolveKey(Request $request): array
    {
        $requestKey = (string) $request->header('X-Cctv-Key', '');

        if (blank($requestKey)) {
            return ['authenticated' => false, 'organization_id' => null];
        }

        $globalKey = app(IntegrationKeyService::class)->globalKey('cctv');
        if (filled($globalKey) && hash_equals($globalKey, $requestKey)) {
            return ['authenticated' => true, 'organization_id' => null];
        }

        $organization = Organization::query()
            ->where('settings->cctv->sync_key', $requestKey)
            ->first();

        if ($organization) {
            return ['authenticated' => true, 'organization_id' => $organization->id];
        }

        return ['authenticated' => false, 'organization_id' => null];
    }

    private function systemUserId(): ?int
    {
        $admin = \App\Models\User::query()
            ->where('role', 'super_admin')
            ->orWhere('role', 'admin')
            ->orderBy('id')
            ->value('id');

        return $admin !== null ? (int) $admin : null;
    }
}