<?php

namespace Tests\Feature;

use App\Models\CbcAssessment;
use App\Models\CbcCompetency;
use App\Models\CbcLearningOutcome;
use App\Models\CbcPathway;
use App\Models\CbcStrand;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\StaffPermissionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CbcFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_cbc_page_with_strands(): void
    {
        [$organization, $admin] = $this->seedRole();
        CbcStrand::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Health & Physical Development',
            'code' => 'HPD',
            'description' => null,
        ]);

        $this->actingAs($admin)
            ->get('/cbc')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/Cbc')
                ->has('strands', 1)
                ->where('strands.0.name', 'Health & Physical Development')
                ->where('strands.0.code', 'HPD'));
    }

    public function test_admin_can_create_strand_and_tree_items(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)->post('/cbc/strand', [
            'name' => 'Communication & Literacy',
            'code' => 'COM',
            'description' => 'Speaking, reading and writing.',
        ])->assertSessionDoesntHaveErrors();

        $strand = CbcStrand::query()->where('organization_id', $organization->id)->firstOrFail();
        $this->assertSame('Communication & Literacy', $strand->name);

        $this->actingAs($admin)->post('/cbc/outcome', [
            'name' => 'Writes coherent paragraphs',
            'cbc_strand_id' => $strand->id,
            'code' => 'COM.L1',
        ])->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('cbc_learning_outcomes', [
            'organization_id' => $organization->id,
            'name' => 'Writes coherent paragraphs',
        ]);

        $this->actingAs($admin)->post('/cbc/pathway', [
            'name' => 'Science pathway',
            'code' => 'SCI',
        ])->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('cbc_pathways', ['organization_id' => $organization->id, 'name' => 'Science pathway']);

        $this->actingAs($admin)->post('/cbc/competency', [
            'name' => 'Critical thinking',
            'cbc_strand_id' => $strand->id,
            'code' => 'CT',
        ])->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('cbc_competencies', ['organization_id' => $organization->id, 'name' => 'Critical thinking']);
    }

    public function test_admin_can_destroy_cbc_item_via_type(): void
    {
        [$organization, $admin] = $this->seedRole();
        $strand = CbcStrand::query()->create(['organization_id' => $organization->id, 'name' => 'Numeracy', 'code' => 'NUM']);
        $pathway = CbcPathway::query()->create(['organization_id' => $organization->id, 'name' => 'Humanities']);

        $this->actingAs($admin)->delete('/cbc/item', [
            'type' => 'strand',
            'id' => $strand->id,
        ])->assertSessionDoesntHaveErrors();
        $this->assertDatabaseMissing('cbc_strands', ['id' => $strand->id]);

        $this->actingAs($admin)->delete('/cbc/item', [
            'type' => 'pathway',
            'id' => $pathway->id,
        ])->assertSessionDoesntHaveErrors();
        $this->assertDatabaseMissing('cbc_pathways', ['id' => $pathway->id]);
    }

    public function test_cannot_destroy_cbc_item_from_another_organization(): void
    {
        [$organization, $admin] = $this->seedRole();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($other);
        $foreign = CbcStrand::query()->create(['organization_id' => $other->id, 'name' => 'Foreign']);

        $this->actingAs($admin)->delete('/cbc/item', [
            'type' => 'strand',
            'id' => $foreign->id,
        ])->assertNotFound();

        $this->assertDatabaseHas('cbc_strands', ['id' => $foreign->id]);
    }

    public function test_admin_can_record_and_destroy_cbc_assessment(): void
    {
        [$organization, $admin] = $this->seedRole();
        $strand = CbcStrand::query()->create(['organization_id' => $organization->id, 'name' => 'Creativity', 'code' => 'CRE']);
        $competency = CbcCompetency::query()->create(['organization_id' => $organization->id, 'name' => 'Innovation', 'cbc_strand_id' => $strand->id]);
        $student = $this->createStudent($organization);

        $this->actingAs($admin)->post('/cbc/assessment', [
            'student_id' => $student->id,
            'cbc_strand_id' => $strand->id,
            'cbc_competency_id' => $competency->id,
            'level' => 'proficient',
            'notes' => 'Strong project work.',
            'assessed_on' => '2026-09-10',
        ])->assertSessionDoesntHaveErrors();

        $assessment = CbcAssessment::query()->where('organization_id', $organization->id)->firstOrFail();
        $this->assertSame('proficient', $assessment->level);

        $this->actingAs($admin)->delete("/cbc/assessment/{$assessment->id}");
        $this->assertDatabaseMissing('cbc_assessments', ['id' => $assessment->id]);
    }

    public function test_cannot_destroy_cbc_assessment_from_another_organization(): void
    {
        [$organization, $admin] = $this->seedRole();
        $other = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($other);
        $student = $this->createStudent($other);
        $foreign = CbcAssessment::query()->create([
            'organization_id' => $other->id,
            'student_id' => $student->id,
            'level' => 'emerging',
            'assessed_on' => Carbon::today(),
            'assessed_by' => $admin->id,
        ]);

        $this->actingAs($admin)->delete("/cbc/assessment/{$foreign->id}")->assertNotFound();

        $this->assertDatabaseHas('cbc_assessments', ['id' => $foreign->id]);
    }

    public function test_driver_cannot_access_cbc_surfaces(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);
        $driver = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'driver',
            'status' => 'active',
        ]);

        $this->actingAs($driver)->get('/cbc')->assertForbidden();
        $this->actingAs($driver)->post('/cbc/strand', ['name' => 'Sneaky'])->assertForbidden();
    }

    private function createStudent(Organization $organization): Student
    {
        return Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-'.random_int(1000, 99999),
            'first_name' => 'Aarav',
            'last_name' => 'Sharma',
            'date_of_birth' => '2015-05-10',
            'gender' => 'male',
            'admission_date' => '2024-06-01',
        ]);
    }

    private function seedRole(): array
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        return [$organization, $admin];
    }

    private function createOrganization(): Organization
    {
        static $counter = 0;
        $counter++;

        return Organization::query()->create([
            'name' => 'CBC School '.$counter,
            'slug' => 'cbc-school-'.$counter,
            'email' => 'cbc-org'.$counter.'@example.com',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Nagpur',
            'state' => 'Maharashtra',
            'country' => 'India',
            'pincode' => '440001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);
    }
}