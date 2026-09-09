<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\User;
use App\Services\DevanagariTransliterationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DevanagariTransliterationTest extends TestCase
{
    use RefreshDatabase;

    public function test_transliterates_names_with_overrides(): void
    {
        $service = app(DevanagariTransliterationService::class);

        $this->assertSame('रमेश', $service->transliterate('Ramesh'));
        $this->assertSame('प्रकाश', $service->transliterate('Prakash'));
        $this->assertSame('सूर्यवंशी', $service->transliterate('Suryawanshi'));
        $this->assertSame('पुणे', $service->transliterate('Pune'));
        $this->assertSame('पल्लवी प्रकाश सूर्यवंशी', $service->transliterate('Pallavi Prakash Suryawanshi'));
    }

    public function test_transliterates_unknown_names_rule_based(): void
    {
        $service = app(DevanagariTransliterationService::class);

        $this->assertSame('अनिल', $service->transliterate('Anil'));
        $this->assertSame('राहुल', $service->transliterate('Rahul'));
        $this->assertSame('अशोक', $service->transliterate('Ashok'));
    }

    public function test_transliterate_endpoint_returns_devanagari(): void
    {
        $organization = Organization::query()->create([
            'name' => 'Test School',
            'slug' => 'test-school',
            'email' => 'school@example.com',
        ]);

        AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->postJson('/settings/transliterate', ['text' => 'Prakash Suryawanshi'])
            ->assertOk()
            ->assertJson(['transliterated' => 'प्रकाश सूर्यवंशी']);
    }
}