<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\UserDeviceToken;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class FirebaseCloudMessagingService
{
    /** @var array<string, ?array> */
    private array $credentials = [];

    /** @var array<string, array{token: string, expires_at: int}> */
    private array $accessTokens = [];

    public function isConfigured(?Organization $organization = null): bool
    {
        return filled($this->projectId($organization))
            && $this->loadCredentials($organization) !== null;
    }

    public function sendToUsers(iterable $userIds, string $title, string $body, array $data = [], ?Organization $organization = null): array
    {
        $userIds = collect($userIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($userIds->isEmpty()) {
            return $this->emptyResult();
        }

        $tokens = UserDeviceToken::query()
            ->whereIn('user_id', $userIds->all())
            ->pluck('token')
            ->filter()
            ->unique()
            ->values()
            ->all();

        return $this->sendToTokens($tokens, $title, $body, $data, $organization);
    }

    public function sendToTokens(array $tokens, string $title, string $body, array $data = [], ?Organization $organization = null): array
    {
        $tokens = collect($tokens)
            ->filter(fn ($token) => is_string($token) && $token !== '')
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return $this->emptyResult();
        }

        if (! $this->isConfigured($organization)) {
            return array_merge($this->emptyResult(), [
                'configured' => false,
                'errors' => ['Firebase is not configured.'],
            ]);
        }

        $endpoint = sprintf(
            'https://fcm.googleapis.com/v1/projects/%s/messages:send',
            $this->projectId($organization)
        );

        $accessToken = $this->getAccessToken($organization);
        $result = $this->emptyResult();
        $result['attemptedCount'] = $tokens->count();

        foreach ($tokens as $token) {
            try {
                $response = Http::withToken($accessToken)
                    ->acceptJson()
                    ->post($endpoint, [
                        'message' => [
                            'token' => $token,
                            'notification' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                            'data' => $this->normalizeDataPayload($data),
                            'android' => [
                                'priority' => 'HIGH',
                                'notification' => [
                                    'sound' => 'default',
                                ],
                            ],
                            'apns' => [
                                'payload' => [
                                    'aps' => [
                                        'sound' => 'default',
                                    ],
                                ],
                            ],
                        ],
                    ]);

                if ($response->successful()) {
                    $result['successCount']++;
                    continue;
                }

                $result['failureCount']++;
                $result['errors'][] = $this->extractErrorMessage($response->json(), $response->body());

                if ($this->isInvalidTokenResponse($response->json())) {
                    $result['invalidTokens'][] = $token;
                }
            } catch (Throwable $exception) {
                $result['failureCount']++;
                $result['errors'][] = $exception->getMessage();
            }
        }

        if (! empty($result['invalidTokens'])) {
            UserDeviceToken::query()
                ->whereIn('token', $result['invalidTokens'])
                ->delete();

            $result['invalidTokens'] = array_values(array_unique($result['invalidTokens']));
        }

        $result['errors'] = array_values(array_unique(array_filter($result['errors'])));

        return $result;
    }

    public function validateCredentials(string $projectId, string $serviceAccountJson): array
    {
        if (blank($projectId) || blank($serviceAccountJson)) {
            return [
                'valid' => false,
                'message' => 'Provide both the Firebase Project ID and the service account JSON.',
            ];
        }

        $credentials = $this->normalizeCredentialsFromJson($serviceAccountJson);

        if (! $credentials) {
            return [
                'valid' => false,
                'message' => 'Service account JSON is invalid. Export a fresh key from Firebase Project Settings > Service accounts.',
            ];
        }

        try {
            $this->requestAccessToken($credentials);

            return [
                'valid' => true,
                'message' => 'Firebase FCM credentials are valid. The service account can authorize push notifications for project '.$projectId.'.',
            ];
        } catch (Throwable $exception) {
            return [
                'valid' => false,
                'message' => 'Unable to authorize with the service account: '.$exception->getMessage(),
            ];
        }
    }

    private function projectId(?Organization $organization = null): string
    {
        if ($organization) {
            $saved = (string) ($organization->settings['communication_settings']['push']['projectId'] ?? '');

            if (filled($saved)) {
                return $saved;
            }
        }

        return (string) (config('services.firebase.project_id') ?? '');
    }

    private function getAccessToken(?Organization $organization = null): string
    {
        $cacheKey = $this->cacheKey($organization);

        if (isset($this->accessTokens[$cacheKey])
            && ($this->accessTokens[$cacheKey]['expires_at'] ?? 0) > (time() + 60)) {
            return $this->accessTokens[$cacheKey]['token'];
        }

        $credentials = $this->loadCredentials($organization);

        if (! $credentials) {
            throw new RuntimeException('Firebase credentials are missing.');
        }

        $this->accessTokens[$cacheKey] = [
            'token' => $this->requestAccessToken($credentials),
            'expires_at' => time() + 3600,
        ];

        return $this->accessTokens[$cacheKey]['token'];
    }

    private function requestAccessToken(array $credentials): string
    {
        $issuedAt = time();
        $jwt = $this->createJwt($credentials, $issuedAt);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Unable to fetch Firebase access token.');
        }

        $payload = $response->json();

        return $payload['access_token'] ?? throw new RuntimeException('Firebase access token was not returned.');
    }

    private function createJwt(array $credentials, int $issuedAt): string
    {
        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ], JSON_THROW_ON_ERROR));

        $claimSet = $this->base64UrlEncode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $issuedAt,
            'exp' => $issuedAt + 3600,
        ], JSON_THROW_ON_ERROR));

        $unsignedToken = $header . '.' . $claimSet;

        $privateKey = openssl_pkey_get_private($credentials['private_key']);

        if (! $privateKey) {
            throw new RuntimeException('Firebase private key is invalid.');
        }

        $signature = '';
        $signed = openssl_sign($unsignedToken, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        openssl_free_key($privateKey);

        if (! $signed) {
            throw new RuntimeException('Unable to sign Firebase JWT.');
        }

        return $unsignedToken . '.' . $this->base64UrlEncode($signature);
    }

    private function loadCredentials(?Organization $organization = null): ?array
    {
        $cacheKey = $this->cacheKey($organization);

        if (array_key_exists($cacheKey, $this->credentials)) {
            return $this->credentials[$cacheKey];
        }

        if ($organization) {
            $json = (string) ($organization->settings['communication_settings']['push']['serviceAccountJson'] ?? '');

            if (filled($json)) {
                $json = $this->decryptSecret($json);
                $credentials = $this->normalizeCredentialsFromJson($json);

                return $this->credentials[$cacheKey] = $credentials;
            }
        }

        $envJson = $this->envCredentialsJson();

        try {
            if (filled($envJson)) {
                $decoded = json_decode($envJson, true, 512, JSON_THROW_ON_ERROR);

                return $this->credentials[$cacheKey] = $this->normalizeCredentials($decoded);
            }

            $path = config('services.firebase.credentials');

            if (filled($path)) {
                $resolvedPath = str_starts_with($path, DIRECTORY_SEPARATOR) ? $path : base_path($path);

                if (! is_file($resolvedPath)) {
                    return $this->credentials[$cacheKey] = null;
                }

                $decoded = json_decode((string) file_get_contents($resolvedPath), true, 512, JSON_THROW_ON_ERROR);

                return $this->credentials[$cacheKey] = $this->normalizeCredentials($decoded);
            }
        } catch (Throwable) {
            return $this->credentials[$cacheKey] = null;
        }

        return $this->credentials[$cacheKey] = null;
    }

    private function normalizeCredentialsFromJson(string $json): ?array
    {
        try {
            $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

            return is_array($decoded) ? $this->normalizeCredentials($decoded) : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function decryptSecret(string $value): string
    {
        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($value);
        } catch (Throwable) {
            return $value;
        }
    }

    private function normalizeCredentials(array $credentials): ?array
    {
        if (blank($credentials['client_email'] ?? null) || blank($credentials['private_key'] ?? null)) {
            return null;
        }

        $credentials['private_key'] = str_replace('\n', "\n", $credentials['private_key']);

        return $credentials;
    }

    private function cacheKey(?Organization $organization = null): string
    {
        return $organization ? 'org-'.$organization->id : 'global';
    }

    private function normalizeDataPayload(array $data): array
    {
        return collect($data)
            ->mapWithKeys(fn ($value, $key) => [(string) $key => is_scalar($value) ? (string) $value : json_encode($value, JSON_THROW_ON_ERROR)])
            ->all();
    }

    private function extractErrorMessage(?array $payload, string $fallback): string
    {
        return $payload['error']['message']
            ?? $payload['error']['status']
            ?? $fallback
            ?? 'Unknown Firebase error.';
    }

    private function isInvalidTokenResponse(?array $payload): bool
    {
        $errorCode = $payload['error']['details'][0]['errorCode'] ?? null;
        $status = $payload['error']['status'] ?? null;

        return in_array($errorCode, ['UNREGISTERED', 'INVALID_ARGUMENT'], true)
            || in_array($status, ['NOT_FOUND', 'INVALID_ARGUMENT'], true);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function emptyResult(): array
    {
        return [
            'configured' => true,
            'attemptedCount' => 0,
            'successCount' => 0,
            'failureCount' => 0,
            'invalidTokens' => [],
            'errors' => [],
        ];
    }
}