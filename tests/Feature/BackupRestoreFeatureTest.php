<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupRestoreFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_restore_dispatches_command_and_logs_out(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('backups/db.sql', 'SELinux-safe placeholder');

        $org = $this->org();
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $this->actingAs($admin)->post('/backups/db.sql/restore')
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_restore_rejects_non_sql_extension(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('backups/evil.txt', 'x');

        $org = $this->org();
        $admin = User::factory()->create(['role' => 'admin', 'organization_id' => $org->id]);

        $this->actingAs($admin)->post('/backups/evil.txt/restore')->assertStatus(422);
    }

    public function test_restore_rejects_missing_file(): void
    {
        Storage::fake('local');
        $exit = Artisan::call('backup:restore', ['file' => 'nope.sql', '--yes' => true]);

        $this->assertSame(1, $exit);
    }

    public function test_non_admin_cannot_restore_via_web(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'organization_id' => $this->org()->id]);

        $this->actingAs($teacher)->post('/backups/db.sql/restore')->assertForbidden();
    }

    private function org(): Organization
    {
        return Organization::create([
            'name' => 'One',
            'slug' => 'one',
            'email' => 'one@school.test',
            'phone' => '1',
            'address' => 'x',
            'status' => 'active',
            'type' => 'school',
            'subscription_plan' => 'trial',
            'subscription_start_date' => now(),
            'subscription_end_date' => now()->addDays(10),
        ]);
    }
}