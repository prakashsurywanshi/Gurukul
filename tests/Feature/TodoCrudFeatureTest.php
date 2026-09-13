<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Todo;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TodoCrudFeatureTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::query()->create([
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

        app(StaffPermissionService::class)->ensureRolesExist($this->organization);

        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'admin',
            'email' => 'principal@gurukul.test',
            'status' => 'active',
        ]);
    }

    public function test_index_renders_todo_page_with_serialized_todos(): void
    {
        Todo::query()->create([
            'user_id' => $this->admin->id,
            'organization_id' => $this->organization->id,
            'title' => 'Collect fees',
            'due_date' => Carbon::today()->addDays(2)->toDateString(),
            'priority' => 'High',
            'note' => 'Follow up in person',
            'completed' => false,
        ]);

        $this->actingAs($this->admin)
            ->get('/todo')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/TodoPage')
                ->has('todos', 1)
                ->where('todos.0.title', 'Collect fees')
                ->where('todos.0.dueDate', fn ($dueDate) => is_string($dueDate) && str_contains($dueDate, '-'))
            );
    }

    public function test_store_creates_todo_and_redirects(): void
    {
        $this->actingAs($this->admin)
            ->post('/todo', [
                'title' => '   Review lesson plans  ',
                'dueDate' => '2026-09-20',
                'priority' => 'Low',
                'note' => ' ',
            ])
            ->assertRedirect('/todo');

        $this->assertDatabaseHas('todos', [
            'user_id' => $this->admin->id,
            'organization_id' => $this->organization->id,
            'title' => 'Review lesson plans',
            'priority' => 'Low',
            'note' => '',
            'completed' => false,
        ]);

        $stored = Todo::query()->where('title', 'Review lesson plans')->first();
        $this->assertSame('2026-09-20', $stored->due_date->toDateString());
    }

    public function test_store_validates_required_fields(): void
    {
        $this->actingAs($this->admin)
            ->post('/todo', ['title' => ''])
            ->assertSessionHasErrors(['title', 'dueDate', 'priority']);

        $this->assertDatabaseCount('todos', 0);
    }

    public function test_update_changes_due_date_and_priority(): void
    {
        $todo = Todo::query()->create([
            'user_id' => $this->admin->id,
            'organization_id' => $this->organization->id,
            'title' => 'Staff meeting',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Medium',
            'note' => '',
            'completed' => false,
        ]);

        $this->actingAs($this->admin)
            ->patch("/todo/{$todo->id}", [
                'title' => 'Staff meeting',
                'dueDate' => '2026-10-01',
                'priority' => 'High',
                'note' => 'Agenda attached',
            ])
            ->assertRedirect('/todo');

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'priority' => 'High',
            'note' => 'Agenda attached',
        ]);

        $this->assertSame('2026-10-01', $todo->fresh()->due_date->toDateString());
    }

    public function test_toggle_marks_completed_then_active(): void
    {
        $todo = Todo::query()->create([
            'user_id' => $this->admin->id,
            'organization_id' => $this->organization->id,
            'title' => 'Buy stationery',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Low',
            'note' => '',
            'completed' => false,
        ]);

        $this->actingAs($this->admin)
            ->patch("/todo/{$todo->id}/toggle")
            ->assertRedirect('/todo');

        $this->assertDatabaseHas('todos', ['id' => $todo->id, 'completed' => true]);
        $this->assertNotNull(Todo::query()->find($todo->id)->completed_at);

        $this->actingAs($this->admin)
            ->patch("/todo/{$todo->id}/toggle")
            ->assertRedirect('/todo');

        $this->assertDatabaseHas('todos', ['id' => $todo->id, 'completed' => false]);
        $this->assertNull(Todo::query()->find($todo->id)->completed_at);
    }

    public function test_destroy_deletes_todo(): void
    {
        $todo = Todo::query()->create([
            'user_id' => $this->admin->id,
            'organization_id' => $this->organization->id,
            'title' => 'Archive reports',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Medium',
            'note' => '',
            'completed' => false,
        ]);

        $this->actingAs($this->admin)
            ->delete("/todo/{$todo->id}")
            ->assertRedirect('/todo');

        $this->assertDatabaseMissing('todos', ['id' => $todo->id]);
    }

    public function test_user_cannot_modify_another_users_todo(): void
    {
        $other = User::factory()->create([
            'organization_id' => $this->organization->id,
            'role' => 'teacher',
            'email' => 'teacher@gurukul.test',
            'status' => 'active',
        ]);

        $todo = Todo::query()->create([
            'user_id' => $other->id,
            'organization_id' => $this->organization->id,
            'title' => 'Private note',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'Low',
            'note' => '',
            'completed' => false,
        ]);

        $this->actingAs($this->admin)
            ->patch("/todo/{$todo->id}", [
                'title' => 'Hacked',
                'dueDate' => '2026-01-01',
                'priority' => 'Low',
                'note' => '',
            ])
            ->assertForbidden();
    }
}