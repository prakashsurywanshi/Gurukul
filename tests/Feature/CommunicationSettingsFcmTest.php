<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserDeviceToken;
use App\Services\FirebaseCloudMessagingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CommunicationSettingsFcmTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_firebase_fcm_push_settings(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();

        $serviceAccount = $this->fakeServiceAccountJson();

        $this->actingAs($user)->patch('/settings/communication', [
            'sms' => ['enabled' => true, 'provider' => 'MSG91', 'senderId' => 'GURUKL', 'apiKey' => ''],
            'email' => [
                'enabled' => true,
                'mailer' => 'SMTP',
                'host' => 'smtp.gmail.com',
                'port' => '587',
                'username' => 'school@example.com',
                'fromAddress' => 'noreply@gurukul.com',
                'fromName' => 'Gurukul ERP',
            ],
            'whatsapp' => ['enabled' => false, 'provider' => 'Twilio', 'phoneNumberId' => '', 'accessToken' => '', 'businessNumber' => '+91 9876543210'],
            'voice' => ['enabled' => false, 'provider' => 'Smartflo', 'apiKey' => '', 'callerId' => '', 'ringTimeout' => 30, 'callTimeout' => 60],
            'qwa' => ['enabled' => false, 'baseUrl' => 'https://qwa.qodeigence.com', 'apiKey' => '', 'sessionId' => '', 'webhookUrl' => '', 'webhookSecret' => '', 'auto_alerts_enabled' => false],
            'push' => [
                'enabled' => true,
                'provider' => 'Firebase FCM',
                'projectId' => 'gurukul-school-app',
                'senderId' => '123456789012',
                'apiKey' => 'web-api-key-abc',
                'serviceAccountJson' => $serviceAccount,
            ],
        ])->assertRedirect('/settings/communication');

        $organization->refresh();

        $this->assertSame('gurukul-school-app', data_get($organization->settings, 'communication_settings.push.projectId'));
        $this->assertSame('123456789012', data_get($organization->settings, 'communication_settings.push.senderId'));
        $this->assertTrue((bool) data_get($organization->settings, 'communication_settings.push.enabled'));
        $this->assertSame('web-api-key-abc', Crypt::decryptString(data_get($organization->settings, 'communication_settings.push.apiKey')));
        $this->assertSame($serviceAccount, Crypt::decryptString(data_get($organization->settings, 'communication_settings.push.serviceAccountJson')));
    }

    public function test_firebase_fcm_validate_credentials_succeeds(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();

        Http::fake([
            'https://oauth2.googleapis.com/*' => Http::response(['access_token' => 'token-abc', 'expires_in' => 3600], 200),
        ]);

        $this->actingAs($user)->postJson('/settings/communication/fcm/validate', [
            'projectId' => 'gurukul-school-app',
            'apiKey' => 'web-api-key-abc',
            'serviceAccountJson' => $this->fakeServiceAccountJson(),
        ])->assertOk()
            ->assertJsonPath('valid', true);
    }

    public function test_firebase_fcm_validate_credentials_fails_on_gateway_error(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();

        Http::fake([
            'https://oauth2.googleapis.com/*' => Http::response(['error' => 'invalid_grant'], 400),
        ]);

        $this->actingAs($user)->postJson('/settings/communication/fcm/validate', [
            'projectId' => 'gurukul-school-app',
            'apiKey' => 'web-api-key-abc',
            'serviceAccountJson' => $this->fakeServiceAccountJson(),
        ])->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_firebase_fcm_validate_requires_project_and_json(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();

        $this->actingAs($user)->postJson('/settings/communication/fcm/validate', [
            'projectId' => '',
            'serviceAccountJson' => 'not-json',
        ])->assertStatus(422);
    }

    public function test_push_notifications_use_organization_fcm_settings(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();

        UserDeviceToken::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'token' => 'device-token-123',
            'platform' => 'android',
        ]);

        $serviceAccount = $this->fakeServiceAccountJson();
        $organization->settings = [
            'communication_settings' => [
                'push' => [
                    'enabled' => true,
                    'provider' => 'Firebase FCM',
                    'projectId' => 'gurukul-school-app',
                    'senderId' => '123456789012',
                    'apiKey' => Crypt::encryptString('web-api-key-abc'),
                    'serviceAccountJson' => Crypt::encryptString($serviceAccount),
                ],
            ],
        ];
        $organization->save();

        Http::fake([
            'https://oauth2.googleapis.com/*' => Http::response(['access_token' => 'token-abc', 'expires_in' => 3600], 200),
            '*fcm.googleapis.com/*' => Http::response(['name' => 'projects/gurukul-school-app/messages/1'], 200),
        ]);

        $result = app(FirebaseCloudMessagingService::class)->sendToUsers(
            [$user->id],
            'Fee reminder',
            'Your fees are due.',
            ['type' => 'message'],
            $organization,
        );

        $this->assertSame(1, $result['successCount']);
        $this->assertSame(0, $result['failureCount']);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'projects/gurukul-school-app/messages:send')
            && $request->header('Authorization') === ['Bearer token-abc']
            && data_get($request['message'], 'token') === 'device-token-123'
            && data_get($request['message'], 'notification.body') === 'Your fees are due.');
    }

    private function fakeServiceAccountJson(): string
    {
        $keyResource = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($keyResource, $privateKey);

        return json_encode([
            'type' => 'service_account',
            'project_id' => 'gurukul-school-app',
            'private_key_id' => 'abc123',
            'private_key' => $privateKey,
            'client_email' => 'firebase-adminsdk@gurukul-school-app.iam.gserviceaccount.com',
            'client_id' => '100900000000000000000',
            'token_uri' => 'https://oauth2.googleapis.com/token',
        ], JSON_THROW_ON_ERROR);
    }

    private function createOrganizationAndAdmin(): array
    {
        $organization = Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => 'gurukul-public-school',
            'email' => 'admin@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
        ]);

        return [$organization, $user];
    }
}