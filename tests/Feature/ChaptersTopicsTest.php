<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Organization;
use App\Models\Subject;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChaptersTopicsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_chapters_topics_page(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $subject = $this->createSubject($organization);

        $this->actingAs($admin)
            ->get('/chapters-topics')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/ChaptersTopics')
                ->has('subjects', 1)
                ->where('subjects.0.name', 'Mathematics')
                ->where('selectedSubjectId', null)
            );
    }

    public function test_admin_can_add_chapter_and_topic(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $subject = $this->createSubject($organization);

        $this->actingAs($admin)
            ->post('/chapters-topics', [
                'subject_id' => $subject->id,
                'parent_id' => null,
                'name' => 'Real Numbers',
                'description' => 'Number systems',
            ])
            ->assertRedirect();

        $chapter = Chapter::query()->where('subject_id', $subject->id)->first();
        $this->assertNotNull($chapter);

        $this->actingAs($admin)
            ->post('/chapters-topics', [
                'subject_id' => $subject->id,
                'parent_id' => $chapter->id,
                'name' => 'Integers',
                'description' => null,
            ])
            ->assertRedirect();

        $this->assertSame(2, Chapter::query()->count());
        $this->assertSame('topic', $chapter->children()->first()->type);
    }

    public function test_chapter_tree_lists_topics_under_chapters(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $subject = $this->createSubject($organization);
        $chapter = Chapter::query()->create([
            'organization_id' => $organization->id,
            'subject_id' => $subject->id,
            'name' => 'Real Numbers',
            'sort_order' => 1,
        ]);
        Chapter::query()->create([
            'organization_id' => $organization->id,
            'subject_id' => $subject->id,
            'parent_id' => $chapter->id,
            'name' => 'Integers',
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->get("/chapters-topics?subject={$subject->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('tree', 1)
                ->where('tree.0.name', 'Real Numbers')
                ->where('tree.0.childrenCount', 1)
                ->has('tree.0.topics', 1)
                ->where('tree.0.topics.0.name', 'Integers')
                ->where('totalChapters', 1)
            );
    }

    public function test_admin_can_update_chapter_name(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $subject = $this->createSubject($organization);
        $chapter = Chapter::query()->create([
            'organization_id' => $organization->id,
            'subject_id' => $subject->id,
            'name' => 'Old Name',
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->put("/chapters-topics/{$chapter->id}", [
                'name' => 'New Name',
                'description' => 'Updated',
            ])
            ->assertRedirect();

        $this->assertSame('New Name', $chapter->fresh()->name);
        $this->assertSame('Updated', $chapter->fresh()->description);
    }

    public function test_admin_can_delete_topic(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $admin = $this->createUser($organization, 'admin');
        $subject = $this->createSubject($organization);
        $chapter = Chapter::query()->create([
            'organization_id' => $organization->id,
            'subject_id' => $subject->id,
            'name' => 'Real Numbers',
            'sort_order' => 1,
        ]);
        $topic = Chapter::query()->create([
            'organization_id' => $organization->id,
            'subject_id' => $subject->id,
            'parent_id' => $chapter->id,
            'name' => 'Integers',
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->delete("/chapters-topics/{$topic->id}")
            ->assertRedirect();

        $this->assertNull(Chapter::query()->find($topic->id));
        $this->assertNotNull($chapter->fresh());
    }

    public function test_cannot_add_topic_under_other_organization_chapter(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $otherOrganization = $this->createOrganization('sister-school', 'sister@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($otherOrganization);

        $admin = $this->createUser($organization, 'admin');
        $subject = $this->createSubject($organization);
        $otherSubject = $this->createSubject($otherOrganization, 'Science', 'SCI');
        $otherChapter = Chapter::query()->create([
            'organization_id' => $otherOrganization->id,
            'subject_id' => $otherSubject->id,
            'name' => 'Force',
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->post('/chapters-topics', [
                'subject_id' => $subject->id,
                'parent_id' => $otherChapter->id,
                'name' => 'Nested topic',
                'description' => null,
            ])
            ->assertNotFound();

        $this->assertSame(1, Chapter::query()->count());
    }

    public function test_receptionist_cannot_access_chapters_topics(): void
    {
        $organization = $this->createOrganization();
        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $receptionist = $this->createUser($organization, 'receptionist');

        $this->actingAs($receptionist)
            ->get('/chapters-topics')
            ->assertForbidden();
    }

    private function createUser(Organization $organization, string $role): User
    {
        return User::factory()->create([
            'organization_id' => $organization->id,
            'role' => $role,
            'status' => 'active',
        ]);
    }

    private function createOrganization(string $slug = 'gurukul-public-school', string $email = 'admin@gurukul.test'): Organization
    {
        return Organization::query()->create([
            'name' => 'Gurukul Public School',
            'slug' => $slug,
            'email' => $email,
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

    private function createSubject(Organization $organization, string $name = 'Mathematics', string $code = 'MATH'): Subject
    {
        return Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => $name,
            'code' => $code,
            'type' => 'core',
        ]);
    }
}