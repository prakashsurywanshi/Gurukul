<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tenancy coverage for the parent-facing API.
 *
 * `ParentApiController::kidsFor()` links children by parent email, parent phone,
 * or an explicit `user_id`. All three of those values are shared across
 * tenants, so without an organization filter a parent in one school could list
 * — and read fees, attendance, homework and payments for — students belonging
 * to a different school that happened to record the same guardian email.
 */
class ParentApiTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_kids_are_scoped_to_the_parents_organization(): void
    {
        $parent = $this->createParent('shared.guardian@example.test', '9998887771', 'alpha');

        [, $ownChild] = $this->createChild('Alpha School', $parent->email, 'ADM-A1', 'first');
        $this->createChild('Beta School', $parent->email, 'ADM-B1', 'second');

        $response = $this->actingAs($parent, 'sanctum')
            ->getJson('/api/parent/kids')
            ->assertOk();

        $ids = collect($response->json('students'))->pluck('id')->map(fn ($id) => (string) $id)->all();

        $this->assertSame([(string) $ownChild->id], $ids, 'A matching guardian email in another tenant must not be returned.');
    }

    public function test_phone_matched_kids_are_scoped_to_the_parents_organization(): void
    {
        $parent = $this->createParent('phone.guardian@example.test', '9998887772', 'alpha');

        [, $own] = $this->createChild('Alpha School', 'someone.else@example.test', 'ADM-A2', 'first', [
            'father_phone' => '9998887772',
        ]);
        $this->createChild('Beta School', 'yet.another@example.test', 'ADM-B2', 'second', [
            'father_phone' => '9998887772',
        ]);

        $response = $this->actingAs($parent, 'sanctum')
            ->getJson('/api/parent/kids')
            ->assertOk();

        $ids = collect($response->json('students'))->pluck('id')->map(fn ($id) => (string) $id)->all();
        $this->assertSame([(string) $own->id], $ids);
    }

    public function test_user_id_linked_kids_are_scoped_to_the_parents_organization(): void
    {
        $parent = $this->createParent('linked.guardian@example.test', '9998887773', 'alpha');

        [, $own] = $this->createChild('Alpha School', 'no.match.1@example.test', 'ADM-A3', 'first', [], $parent->id);
        // A student in another organization that still points `user_id` at this
        // parent's account. Only possible via bad data, but it is exactly the
        // case an unscoped `orWhereIn('user_id', ...)` would leak.
        $this->createChild('Beta School', 'no.match.2@example.test', 'ADM-B3', 'second', [], $parent->id);

        $response = $this->actingAs($parent, 'sanctum')
            ->getJson('/api/parent/kids')
            ->assertOk();

        $ids = collect($response->json('students'))->pluck('id')->map(fn ($id) => (string) $id)->all();
        $this->assertSame([(string) $own->id], $ids);
    }

    public function test_parent_without_an_organization_sees_no_children(): void
    {
        $parent = $this->createParent('orphan.guardian@example.test', '9998887774', 'alpha');
        $this->createChild('Alpha School', $parent->email, 'ADM-A4', 'first');

        $parent->update(['organization_id' => null]);

        $response = $this->actingAs($parent->fresh(), 'sanctum')
            ->getJson('/api/parent/kids')
            ->assertOk();

        $this->assertSame([], $response->json('students'));
    }

    public function test_child_scoped_endpoints_reject_a_cross_tenant_student(): void
    {
        $parent = $this->createParent('scoped.guardian@example.test', '9998887775', 'alpha');
        $this->createChild('Alpha School', $parent->email, 'ADM-A5', 'first');

        [, $foreignChild] = $this->createChildFor('Beta School', 'ADM-B5', 'foreign');

        foreach ([
            "/api/parent/kids/{$foreignChild->id}/fees",
            "/api/parent/kids/{$foreignChild->id}/attendance",
            "/api/parent/kids/{$foreignChild->id}/homework",
            "/api/parent/kids/{$foreignChild->id}/payments",
        ] as $endpoint) {
            $this->actingAs($parent, 'sanctum')
                ->getJson($endpoint)
                ->assertNotFound("A student from another tenant must not be readable via {$endpoint}.");
        }
    }

    public function test_ticket_creation_rejects_a_cross_tenant_student(): void
    {
        $parent = $this->createParent('ticket.guardian@example.test', '9998887776', 'alpha');
        $this->createChild('Alpha School', $parent->email, 'ADM-A6', 'first');

        [, $foreignChild] = $this->createChildFor('Beta School', 'ADM-B6', 'foreign');

        $this->actingAs($parent, 'sanctum')
            ->postJson('/api/parent/tickets', [
                'subject' => 'Cross tenant attempt',
                'message' => 'Should be rejected.',
                'student_id' => $foreignChild->id,
            ])
            ->assertStatus(422);

        $this->assertDatabaseMissing('support_tickets', ['student_id' => $foreignChild->id]);
    }

    public function test_ticket_listing_is_scoped_to_the_parents_organization(): void
    {
        $parent = $this->createParent('listing.guardian@example.test', '9998887777', 'alpha');
        $organization = $this->createOrganization('Alpha School', 'alpha');
        $otherOrganization = $this->createOrganization('Beta School', 'beta');

        SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'student_id' => null,
            'created_by' => $parent->id,
            'subject' => 'Alpha ticket',
            'department' => 'academics',
            'priority' => 'medium',
            'status' => 'open',
        ]);

        SupportTicket::query()->create([
            'organization_id' => $otherOrganization->id,
            'student_id' => null,
            'created_by' => $parent->id,
            'subject' => 'Beta ticket raised elsewhere',
            'department' => 'academics',
            'priority' => 'medium',
            'status' => 'open',
        ]);

        $response = $this->actingAs($parent, 'sanctum')
            ->getJson('/api/parent/tickets')
            ->assertOk();

        $subjects = collect($response->json('tickets'))->pluck('subject')->all();
        $this->assertSame(['Alpha ticket'], $subjects);
    }

    public function test_ticket_listing_requires_the_parent_role(): void
    {
        $parent = $this->createParent('role.guardian@example.test', '9998887778', 'alpha');
        $admin = User::query()->create([
            'organization_id' => $parent->organization_id,
            'name' => 'Not A Parent',
            'email' => 'admin.tenant@example.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/parent/tickets')
            ->assertForbidden();
    }

    // ---- fixtures ---------------------------------------------------------

    private function createOrganization(string $name, string $slug): Organization
    {
        // firstOrCreate: several tests build both the parent and the "other
        // tenant" fixtures for the same slug, and organizations.slug is unique.
        return Organization::query()->firstOrCreate(
            ['slug' => $slug],
            $this->organizationAttributes($name, $slug),
        );
    }

    private function organizationAttributes(string $name, string $slug): array
    {
        return [
            'name' => $name,
            // Slug is non-nullable; firstOrCreate callers that key off `name`
            // must still supply it.
            'slug' => $slug,
            'email' => $slug.'@example.test',
            'phone' => '90000000'.abs(crc32($slug)) % 100,
            'address' => 'Main Road',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'settings' => [],
        ];
    }

    private function createParent(string $email, string $phone, string $slug): User
    {
        return User::query()->create([
            'organization_id' => $this->createOrganization(ucfirst($slug).' School', $slug)->id,
            'name' => 'Test Guardian',
            'email' => $email,
            'phone' => $phone,
            'password' => bcrypt('password'),
            'role' => 'parent',
            'status' => 'active',
        ]);
    }

    private function createChild(
        string $organizationName,
        string $guardianEmail,
        string $admissionNo,
        string $firstName,
        array $overrides = [],
        ?int $linkedUserId = null,
    ): array {
        // Resolve-or-create: the cross-tenant cases reference the second school
        // by name without building an explicit organization fixture.
        $organization = Organization::query()->firstOrCreate(
            ['name' => $organizationName],
            $this->organizationAttributes($organizationName, str($organizationName)->slug()->value()),
        );

        $year = AcademicYear::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'name' => '2026-2027'],
            [
                'start_date' => '2026-04-01',
                'end_date' => '2027-03-31',
                'is_current' => true,
                'status' => 'active',
            ],
        );

        $class = SchoolClass::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'academic_year_id' => $year->id, 'name' => '5', 'section' => 'A'],
            ['status' => 'active'],
        );

        $student = Student::query()->create(array_merge([
            'organization_id' => $organization->id,
            'admission_no' => $admissionNo,
            'first_name' => $firstName,
            'last_name' => 'Student',
            'father_email' => $guardianEmail,
            'mother_email' => null,
            'guardian_email' => null,
            'class_id' => $class->id,
            'user_id' => $linkedUserId,
            'status' => 'active',
            // Required, non-nullable columns on the MySQL schema.
            'date_of_birth' => '2015-06-15',
            'gender' => 'male',
            'admission_date' => now()->toDateString(),
        ], $overrides));

        return [$organization, $student];
    }

    private function createChildFor(string $organizationName, string $admissionNo, string $firstName): array
    {
        return $this->createChild($organizationName, 'unmatched@example.test', $admissionNo, $firstName);
    }
}