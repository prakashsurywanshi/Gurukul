<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactSupportFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_lists_tickets_for_admin(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $ticket = SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'subject' => 'Login issue',
            'department' => 'academics',
            'priority' => 'high',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        SupportTicketReply::query()->create([
            'organization_id' => $organization->id,
            'ticket_id' => $ticket->id,
            'user_id' => $admin->id,
            'message' => 'My first message',
        ]);

        $this->actingAs($admin)
            ->get('/contact-support')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ContactSupport')
                ->has('tickets', 1)
                ->where('tickets.0.subject', 'Login issue')
                ->has('tickets.0.replies', 1)
                ->where('tickets.0.replies.0.message', 'My first message'));
    }

    public function test_staff_only_sees_own_tickets(): void
    {
        [$organization, $admin] = $this->seedOrganization();
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'subject' => 'Admin ticket',
            'department' => 'fees',
            'priority' => 'low',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'subject' => 'Teacher ticket',
            'department' => 'library',
            'priority' => 'medium',
            'status' => 'open',
            'created_by' => $teacher->id,
        ]);

        $this->actingAs($teacher)
            ->get('/contact-support')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('tickets', 1)
                ->where('tickets.0.subject', 'Teacher ticket'));
    }

    public function test_store_creates_ticket_with_first_reply(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $this->actingAs($admin)
            ->from('/contact-support')
            ->post('/contact-support', [
                'subject' => 'Need help',
                'department' => 'transport',
                'priority' => 'medium',
                'message' => 'Bus timing question',
            ])
            ->assertRedirect('/contact-support')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('support_tickets', [
            'organization_id' => $organization->id,
            'subject' => 'Need help',
            'department' => 'transport',
            'status' => 'open',
        ]);

        $ticket = SupportTicket::query()->where('organization_id', $organization->id)->first();
        $this->assertNotNull($ticket);
        $this->assertNull($ticket->student_id);
        $this->assertDatabaseHas('support_ticket_replies', [
            'ticket_id' => $ticket->id,
            'message' => 'Bus timing question',
        ]);
    }

    public function test_store_requires_subject_and_message(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $this->actingAs($admin)
            ->from('/contact-support')
            ->post('/contact-support', [
                'department' => 'fees',
                'priority' => 'low',
            ])
            ->assertRedirect('/contact-support')
            ->assertSessionHasErrors(['subject', 'message']);

        $this->assertDatabaseCount('support_tickets', 0);
    }

    public function test_teacher_can_submit_ticket(): void
    {
        [$organization] = $this->seedOrganization();
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)
            ->from('/contact-support')
            ->post('/contact-support', [
                'subject' => 'Help desk',
                'department' => 'other',
                'priority' => 'high',
                'message' => 'Broken projector',
            ])
            ->assertRedirect('/contact-support');

        $this->assertDatabaseCount('support_tickets', 1);
    }

    public function test_reply_sets_ticket_to_in_progress(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $ticket = SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'subject' => 'Question',
            'department' => 'academics',
            'priority' => 'low',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->post("/contact-support/{$ticket->id}/reply", ['message' => 'Following up'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('support_ticket_replies', [
            'ticket_id' => $ticket->id,
            'message' => 'Following up',
        ]);
        $this->assertDatabaseHas('support_tickets', ['id' => $ticket->id, 'status' => 'in_progress']);
    }

    public function test_resolving_ticket_sets_resolved_at(): void
    {
        [$organization, $admin] = $this->seedOrganization();

        $ticket = SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'subject' => 'Solved',
            'department' => 'fees',
            'priority' => 'low',
            'status' => 'open',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch("/contact-support/{$ticket->id}", ['status' => 'resolved'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('support_tickets', ['id' => $ticket->id, 'status' => 'resolved']);
        $this->assertNotNull($ticket->fresh()->resolved_at);
    }

    public function test_cannot_manage_ticket_from_another_organization(): void
    {
        [$organization] = $this->seedOrganization();
        $other = Organization::query()->create([
            'name' => 'Other School',
            'slug' => 'other-school',
            'email' => 'other@gurukul.test',
            'phone' => '8888888888',
            'address' => 'Another Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'max_students' => 500,
            'max_staff' => 50,
            'settings' => [],
        ]);

        $foreignTicket = SupportTicket::query()->create([
            'organization_id' => $other->id,
            'subject' => 'Foreign',
            'department' => 'other',
            'priority' => 'low',
            'status' => 'open',
            'created_by' => $this->createAdmin($other)->id,
        ]);

        $admin = $this->createAdmin($organization);

        $this->actingAs($admin)
            ->post("/contact-support/{$foreignTicket->id}/reply", ['message' => 'Hack'])
            ->assertForbidden();

        $this->actingAs($admin)
            ->patch("/contact-support/{$foreignTicket->id}", ['status' => 'resolved'])
            ->assertForbidden();
    }

    public function test_parent_cannot_open_contact_support(): void
    {
        [$organization] = $this->seedOrganization();
        $parent = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'parent',
            'status' => 'active',
        ]);

        $this->actingAs($parent)
            ->get('/contact-support')
            ->assertForbidden();
    }

    private function seedOrganization(): array
    {
        $organization = $this->createOrganization();
        $admin = $this->createAdmin($organization);

        return [$organization, $admin];
    }

    private function createAdmin(Organization $organization): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    private function createOrganization(): Organization
    {
        return Organization::query()->create([
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
    }
}