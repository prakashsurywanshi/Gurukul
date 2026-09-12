<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelRoom;
use App\Models\HostelRoomType;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HostelRoomTypesAndAllocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_room_types_page(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/hostel/room-types')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/HostelRoomTypes')
                ->has('defaults', 4)
                ->has('roomTypes')
                ->has('usage')
            );
    }

    public function test_admin_can_add_custom_room_type(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->post('/hostel/room-types', [
                'name' => 'suite',
                'label' => 'Suite',
                'capacity' => 1,
                'fee' => 5000,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('hostel_room_types', [
            'organization_id' => $organization->id,
            'name' => 'suite',
            'default_capacity' => 1,
            'status' => true,
        ]);
    }

    public function test_custom_room_type_is_usable_when_creating_a_room(): void
    {
        [$organization, $admin] = $this->seedRole();

        HostelRoomType::query()->create([
            'organization_id' => $organization->id,
            'name' => 'suite',
            'label' => 'Suite',
            'default_capacity' => 1,
            'status' => true,
        ]);

        $hostel = $this->createHostel($organization);

        $this->actingAs($admin)
            ->post('/hostel-management/rooms', [
                'hostelId' => $hostel->id,
                'roomNumber' => '101',
                'roomType' => 'suite',
                'capacity' => 1,
                'status' => 'available',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('hostel_rooms', [
            'hostel_id' => $hostel->id,
            'room_number' => '101',
            'room_type' => 'suite',
        ]);
    }

    public function test_system_room_type_name_cannot_be_duplicated(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->post('/hostel/room-types', ['name' => 'single'])
            ->assertRedirect()
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_update_and_delete_custom_room_type(): void
    {
        [$organization, $admin] = $this->seedRole();

        $type = HostelRoomType::query()->create([
            'organization_id' => $organization->id,
            'name' => 'suite',
            'label' => 'Suite',
            'default_capacity' => 1,
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->patch("/hostel/room-types/{$type->id}", ['label' => 'Premium Suite', 'capacity' => 2, 'status' => false])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('hostel_room_types', [
            'id' => $type->id,
            'label' => 'Premium Suite',
            'default_capacity' => 2,
            'status' => false,
        ]);

        $this->actingAs($admin)
            ->delete("/hostel/room-types/{$type->id}")
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('hostel_room_types', ['id' => $type->id]);
    }

    public function test_admin_can_view_student_allocation_page(): void
    {
        [$organization, $admin] = $this->seedRole();

        $this->actingAs($admin)
            ->get('/hostel/allocations')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/HostelAllocations')
                ->has('allocations')
                ->has('students')
                ->has('hostels')
                ->has('rooms')
                ->has('beds')
            );
    }

    public function test_admin_can_allocate_student_to_a_bed(): void
    {
        [$organization, $admin] = $this->seedRole();
        $hostel = $this->createHostel($organization);
        $room = $this->createRoom($hostel);
        $bed = $this->createBed($hostel, $room);
        [$academicYear, $class] = $this->seedStudentContext($organization);
        $student = $this->createStudent($organization, $academicYear, $class);

        $this->actingAs($admin)
            ->post('/hostel/allocations', [
                'studentId' => $student->id,
                'hostelId' => $hostel->id,
                'roomId' => $room->id,
                'bedId' => $bed->id,
                'allocationDate' => '2026-09-01',
                'remarks' => 'Hostel boarder',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('hostel_allocations', [
            'student_id' => $student->id,
            'bed_id' => $bed->id,
            'status' => 'active',
            'allocation_date' => '2026-09-01 00:00:00',
        ]);
        $this->assertDatabaseHas('hostel_beds', ['id' => $bed->id, 'status' => 'occupied']);
        $this->assertSame('101 / B1', $student->fresh()->hostel_room);
    }

    public function test_occupied_bed_cannot_be_reassigned(): void
    {
        [$organization, $admin] = $this->seedRole();
        $hostel = $this->createHostel($organization);
        $room = $this->createRoom($hostel);
        $bed = $this->createBed($hostel, $room);
        [$academicYear, $class] = $this->seedStudentContext($organization);
        $studentA = $this->createStudent($organization, $academicYear, $class, 'ADM-1002');
        $studentB = $this->createStudent($organization, $academicYear, $class, 'ADM-1003');

        HostelAllocation::query()->create([
            'student_id' => $studentA->id,
            'hostel_id' => $hostel->id,
            'room_id' => $room->id,
            'bed_id' => $bed->id,
            'allocation_date' => '2026-09-01',
            'status' => 'active',
        ]);
        $bed->update(['status' => 'occupied']);

        $this->actingAs($admin)
            ->post('/hostel/allocations', [
                'studentId' => $studentB->id,
                'hostelId' => $hostel->id,
                'roomId' => $room->id,
                'bedId' => $bed->id,
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('bedId');
    }

    public function test_admin_can_release_an_allocation(): void
    {
        [$organization, $admin] = $this->seedRole();
        $hostel = $this->createHostel($organization);
        $room = $this->createRoom($hostel);
        $bed = $this->createBed($hostel, $room);
        [$academicYear, $class] = $this->seedStudentContext($organization);
        $student = $this->createStudent($organization, $academicYear, $class);

        $this->actingAs($admin)
            ->post('/hostel/allocations', [
                'studentId' => $student->id,
                'hostelId' => $hostel->id,
                'roomId' => $room->id,
                'bedId' => $bed->id,
            ]);

        $allocation = HostelAllocation::query()->where('student_id', $student->id)->where('status', 'active')->firstOrFail();

        $this->actingAs($admin)
            ->post("/hostel/allocations/{$allocation->id}/release")
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('vacated', $allocation->fresh()->status);
        $this->assertDatabaseHas('hostel_beds', ['id' => $bed->id, 'status' => 'available']);
    }

    public function test_teacher_cannot_access_room_types_or_allocations(): void
    {
        [$organization] = $this->seedRole();
        $teacher = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'teacher',
            'status' => 'active',
        ]);

        $this->actingAs($teacher)->get('/hostel/room-types')->assertForbidden();
        $this->actingAs($teacher)->get('/hostel/allocations')->assertForbidden();
    }

    public function test_room_type_from_another_organization_is_not_accessible(): void
    {
        [$organization, $admin] = $this->seedRole();
        $other = $this->createOrganization('gurukul-other', 'other@gurukul.test');
        app(StaffPermissionService::class)->ensureRolesExist($other);

        $type = HostelRoomType::query()->create([
            'organization_id' => $other->id,
            'name' => 'suite',
            'label' => 'Suite',
            'status' => true,
        ]);

        $this->actingAs($admin)
            ->patch("/hostel/room-types/{$type->id}", ['label' => 'X'])
            ->assertForbidden();
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

    private function createHostel(Organization $organization, string $suffix = ''): Hostel
    {
        return Hostel::query()->create([
            'organization_id' => $organization->id,
            'name' => "Boys Hostel {$suffix}",
            'type' => 'boys',
            'address' => 'Campus Road',
            'status' => 'active',
        ]);
    }

    private function createRoom(Hostel $hostel): HostelRoom
    {
        return HostelRoom::query()->create([
            'hostel_id' => $hostel->id,
            'room_number' => '101',
            'floor' => '1',
            'room_type' => 'double',
            'capacity' => 2,
            'occupied' => 0,
            'monthly_fee' => 2500,
            'status' => 'available',
        ]);
    }

    private function createBed(Hostel $hostel, HostelRoom $room): HostelBed
    {
        return HostelBed::query()->create([
            'hostel_id' => $hostel->id,
            'room_id' => $room->id,
            'bed_number' => 'B1',
            'status' => 'available',
        ]);
    }

    private function seedStudentContext(Organization $organization): array
    {
        $academicYear = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 40,
            'status' => 'active',
        ]);

        return [$academicYear, $class];
    }

    private function createStudent(Organization $organization, AcademicYear $academicYear, SchoolClass $class, string $admissionNo = 'ADM-1001'): Student
    {

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'admission_no' => $admissionNo,
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'session' => $academicYear->name,
            'roll_number' => '5',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        return $student;
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
        ]);
    }
}