<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComplianceProfileTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    private User $librarian;

    protected function setUp(): void
    {
        parent::setUp();
        $this->organization = Organization::query()->create([
            'name' => 'Compliance Profile Test School',
            'slug' => 'compliance-profile-test-school',
            'email' => 'compliance-profile-test@example.com',
        ]);
        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'admin',
        ]);
        $this->librarian = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'librarian',
        ]);
    }

    public function test_admin_can_view_compliance_profile_page(): void
    {
        $this->actingAs($this->admin)
            ->get('/compliance/profile')
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ComplianceProfile')
                ->has('profile')
                ->has('profile.udise_code')
                ->has('profile.affiliation_no')
                ->has('profile.board')
                ->has('profile.affiliated_year')
                ->has('profile.school_category')
                ->has('profile.grades_offered')
                ->has('profile.medium_of_instruction')
                ->has('profile.shift_timings')
                ->has('profile.district')
                ->has('profile.block')
                ->has('fields'));
    }

    public function test_admin_can_update_compliance_profile(): void
    {
        $this->actingAs($this->admin)
            ->patch('/compliance/profile', [
                'profile' => [
                    'udise_code' => '27348100112',
                    'affiliation_no' => 'CBSE-2740201',
                    'board' => 'CBSE',
                    'affiliated_year' => '2019',
                    'school_category' => 'Co-Educational',
                    'grades_offered' => 'Nursery - Class 12',
                    'medium_of_instruction' => 'English',
                    'shift_timings' => '7:30 AM - 2:00 PM',
                ],
                'fields' => [
                    'enable_udise_display' => true,
                    'enable_affiliation_details' => false,
                    'enable_board_details' => true,
                    'enable_recognitions' => false,
                    'enable_grades_offered' => true,
                    'enable_medium_of_instruction' => true,
                    'enable_shift_timings' => false,
                ],
            ])
            ->assertRedirect(route('compliance.profile'));

        $updated = $this->organization->refresh();
        $this->assertSame('27348100112', $updated->settings['compliance_profile']['udise_code']);
        $this->assertSame('CBSE', $updated->settings['compliance_profile']['board']);
        $this->assertTrue($updated->settings['compliance_fields']['enable_udise_display']);
        $this->assertFalse($updated->settings['compliance_fields']['enable_shift_timings']);
    }

    public function test_compliance_profile_persists_across_requests(): void
    {
        $this->actingAs($this->admin)
            ->patch('/compliance/profile', [
                'profile' => [
                    'udise_code' => 'SAVE-1',
                    'affiliation_no' => 'AFF-1',
                    'board' => 'ICSE',
                    'affiliated_year' => '2021',
                    'school_category' => 'Girls',
                    'grades_offered' => 'Class 1 - 10',
                    'medium_of_instruction' => 'Hindi',
                    'shift_timings' => '8:00 AM - 1:00 PM',
                ],
                'fields' => [
                    'enable_udise_display' => false,
                    'enable_affiliation_details' => true,
                    'enable_board_details' => false,
                    'enable_recognitions' => true,
                    'enable_grades_offered' => false,
                    'enable_medium_of_instruction' => true,
                    'enable_shift_timings' => true,
                ],
            ]);

        $this->actingAs($this->admin)
            ->get('/compliance/profile')
            ->assertInertia(fn ($page) => $page
                ->has('profile')
                ->has('profile.udise_code')
                ->has('profile.affiliation_no')
                ->has('profile.board')
                ->has('profile.affiliated_year')
                ->has('profile.school_category')
                ->has('profile.grades_offered')
                ->has('profile.medium_of_instruction')
                ->has('profile.shift_timings')
                ->has('profile.district')
                ->has('profile.block')
                ->where('profile.udise_code', 'SAVE-1')
                ->where('profile.board', 'ICSE')
                ->where('fields.enable_recognitions', true));
    }

    public function test_compliance_profile_rejects_non_admin(): void
    {
        $this->actingAs($this->librarian)
            ->get('/compliance/profile')
            ->assertForbidden();

        $this->actingAs($this->librarian)
            ->patch('/compliance/profile', [
                'profile' => ['udise_code' => 'X'],
                'fields' => ['enable_udise_display' => true],
            ])
            ->assertForbidden();
    }

    public function test_compliance_profile_validates_malformed_payload(): void
    {
        $this->actingAs($this->admin)
            ->patch('/compliance/profile', [
                'profile' => ['udise_code' => str_repeat('9', 40)],
                'fields' => ['enable_udise_display' => 'not-a-bool'],
            ])
            ->assertSessionHasErrors(['profile.udise_code', 'fields.enable_udise_display']);
    }
}