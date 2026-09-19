<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CctvIngestionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_public_when_no_key_configured(): void
    {
        $this->getJson('/api/cctv/status')->assertOk()->assertJsonPath('configured', false);
    }

    public function test_face_scan_rejected_without_key_when_unconfigured(): void
    {
        $this->postJson('/api/cctv/face-scan', ['camera' => 'Gate'])->assertStatus(503);
    }

    public function test_face_scan_rejected_with_invalid_key_when_configured(): void
    {
        $this->organization()->update(['settings' => ['cctv' => ['sync_key' => 'org-key-123']]]);

        $this->postJson('/api/cctv/face-scan', ['camera' => 'Gate'])->assertStatus(401);
    }

    public function test_face_scan_without_image_records_logs_scoped_to_org(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['cctv' => ['sync_key' => 'org-key-123']]]);

        $cameraId = $this->seedCamera($org, 'Main Gate', 'Gate');

        $this->postJson('/api/cctv/face-scan', [
            'camera' => 'Main Gate',
            'uid' => 'CAM-UID-1',
        ], ['X-Cctv-Key' => 'org-key-123'])
            ->assertStatus(201)
            ->assertJsonPath('matched', false)
            ->assertJsonPath('vision.requested', false);

        $this->assertDatabaseHas('biometric_logs', [
            'organization_id' => $org->id,
            'log_type' => 'face',
            'matched' => false,
            'action' => 'camera:Main Gate',
        ]);
        $this->assertDatabaseHas('cctv_access_logs', [
            'organization_id' => $org->id,
            'cctv_camera_id' => $cameraId,
            'action' => 'face_scan',
        ]);
    }

    public function test_face_scan_unknown_camera_still_logs(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['cctv' => ['sync_key' => 'org-key-123']]]);

        $this->postJson('/api/cctv/face-scan', [
            'camera' => 'Not Registered',
        ], ['X-Cctv-Key' => 'org-key-123'])
            ->assertStatus(201);

        $this->assertDatabaseHas('biometric_logs', [
            'organization_id' => $org->id,
            'action' => 'camera:unknown',
        ]);
        $this->assertDatabaseHas('cctv_access_logs', [
            'organization_id' => $org->id,
            'action' => 'unknown_camera',
        ]);
    }

    public function test_face_scan_does_not_link_camera_from_other_org(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['cctv' => ['sync_key' => 'org-key-123']]]);

        $other = Organization::create($this->organizationFields('Org B', 'org-b'));
        $this->seedCamera($other, 'Foreign Cam', 'Lab');

        $this->postJson('/api/cctv/face-scan', [
            'camera' => 'Foreign Cam',
        ], ['X-Cctv-Key' => 'org-key-123'])
            ->assertStatus(201)
            ->assertJsonPath('matched', false);

        $this->assertDatabaseHas('biometric_logs', [
            'organization_id' => $org->id,
            'action' => 'camera:unknown',
        ]);
    }

    public function test_face_scan_with_image_without_ai_reports_vision_unavailable(): void
    {
        $org = $this->organization();
        $org->update(['settings' => ['cctv' => ['sync_key' => 'org-key-123'], 'ai' => ['mode' => 'local']]]);

        $this->postJson('/api/cctv/face-scan', [
            'camera' => 'Gate',
            'image' => 'data:image/jpeg;base64,' . base64_encode('fake-image'),
        ], ['X-Cctv-Key' => 'org-key-123'])
            ->assertStatus(201)
            ->assertJsonPath('vision.requested', true)
            ->assertJsonPath('vision.available', false)
            ->assertJsonPath('matched', false);

        $this->assertDatabaseHas('biometric_logs', [
            'organization_id' => $org->id,
            'log_type' => 'face',
        ]);
    }

    private function organization(): Organization
    {
        if ($org = Organization::first()) {
            return $org;
        }

        return Organization::create($this->organizationFields('Preview School', 'preview-school'));
    }

    private function organizationFields(string $name, string $slug): array
    {
        return [
            'name' => $name,
            'slug' => $slug,
            'email' => $slug . '@school.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now()->subDays(10),
            'subscription_end_date' => now()->addDays(20),
        ];
    }

    private function seedCamera(Organization $organization, string $name, string $location): int
    {
        return DB::table('cctv_cameras')->insertGetId([
            'organization_id' => $organization->id,
            'name' => $name,
            'location' => $location,
            'camera_type' => 'gate',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}