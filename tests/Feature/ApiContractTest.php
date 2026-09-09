<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiContractTest extends TestCase
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
            'email' => 'school@gurukul.test',
            'phone' => '9999999999',
            'address' => 'Main Road',
            'city' => 'Jaipur',
            'state' => 'Rajasthan',
            'country' => 'India',
            'pincode' => '302001',
            'type' => 'school',
            'status' => 'active',
            'subscription_plan' => 'premium',
            'subscription_start_date' => now()->subMonth()->toDateString(),
            'subscription_end_date' => now()->addMonth()->toDateString(),
            'max_students' => 1000,
            'max_staff' => 100,
            'settings' => [],
        ]);

        AcademicYear::query()->create([
            'organization_id' => $this->organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $this->admin = User::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'admin@gurukul.test',
            'password' => 'password',
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
        ]);
    }

    public function test_login_returns_token_and_user_contract(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'admin@gurukul.test',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Login successful')
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role'],
                'token',
            ]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@gurukul.test',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/todo')->assertUnauthorized();
    }

    public function test_authenticated_user_contract(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@gurukul.test')
            ->assertJsonPath('user.role', 'admin');
    }

    public function test_dashboard_contract(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('success', true);
    }

    public function test_students_api_contract(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/students')->assertOk();
    }

    public function test_staff_api_contract(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/staff')->assertOk();
    }

    public function test_academics_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/academics/classes',
            '/api/academics/subjects',
            '/api/academics/timetable',
            '/api/academics/lesson-plans',
            '/api/academics/homework',
            '/api/academics/promote/data',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_attendance_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $academicYear = AcademicYear::query()->where('organization_id', $this->organization->id)->firstOrFail();

        $class = SchoolClass::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 40,
            'status' => 'active',
        ]);

        $this->getJson('/api/attendance/classes')->assertOk();
        $this->getJson('/api/attendance/students?class_id='.$class->id.'&date=2026-05-25')->assertOk();
        $this->getJson('/api/attendance/records?class_id='.$class->id)->assertOk();
    }

    public function test_fees_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/fees/overview',
            '/api/fees/structures',
            '/api/fees/students',
            '/api/fees/student-fees',
            '/api/fees/payments',
            '/api/fees/income',
            '/api/fees/expenses',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_exams_and_online_exams_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/exams')->assertOk();
        $this->getJson('/api/online-exams')->assertOk();
    }

    public function test_feedback_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/feedback/admin')->assertOk();
    }

    public function test_communication_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/communication/audience-options',
            '/api/communication/messages',
            '/api/communication/notices',
            '/api/communication/voice-calls',
            '/api/communication/emails',
            '/api/communication/download-center',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_hostel_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/hostel/overview',
            '/api/hostel/hostels',
            '/api/hostel/rooms',
            '/api/hostel/beds',
            '/api/hostel/fee-structures',
            '/api/hostel/fee-collection',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_transport_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/transport/overview',
            '/api/transport/routes',
            '/api/transport/vehicles',
            '/api/transport/assignments',
            '/api/transport/trips',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_certificates_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        foreach (['/api/certificates/overview', '/api/certificates/templates', '/api/certificates/issued'] as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_inventory_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/inventory/overview',
            '/api/inventory/categories',
            '/api/inventory/stores',
            '/api/inventory/suppliers',
            '/api/inventory/items',
            '/api/inventory/stock',
            '/api/inventory/issues',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_library_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/library/overview',
            '/api/library/books',
            '/api/library/members',
            '/api/library/circulation',
            '/api/library/requests',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_sessions_and_todo_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/sessions')->assertOk();

        $this->getJson('/api/todo')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => []]);
    }

    public function test_reports_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/reports/overview')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/reports/analytics')->assertOk();
    }

    public function test_knowledge_base_api_contract(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/knowledge-base')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['title', 'modules', 'faqs']]);
    }

    public function test_front_office_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        $endpoints = [
            '/api/front-office/admission-enquiries',
            '/api/front-office/visitors',
            '/api/front-office/phone-calls',
            '/api/front-office/postal-dispatches',
            '/api/front-office/postal-deliveries',
            '/api/front-office/complaints',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }

    public function test_roles_permissions_api_contract(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/roles/permissions')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_student_portal_api_contracts(): void
    {
        $academicYear = AcademicYear::query()->where('organization_id', $this->organization->id)->firstOrFail();

        $class = SchoolClass::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => '10',
            'section' => 'A',
            'room_number' => '101',
            'capacity' => 40,
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $this->organization->id,
            'class_id' => $class->id,
            'admission_no' => 'ADM-2026-0001',
            'roll_number' => '1',
            'first_name' => 'Rahul',
            'last_name' => 'Kumar',
            'email' => 'rahul@gurukul.test',
            'date_of_birth' => '2012-05-10',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'session' => $academicYear->name,
            'roll_number' => '1',
            'status' => 'active',
            'is_current' => true,
            'entry_type' => 'admission',
            'effective_date' => '2026-04-10',
        ]);

        $studentUser = User::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Rahul Kumar',
            'email' => 'rahul@gurukul.test',
            'password' => bcrypt('password'),
            'role' => 'student',
            'status' => 'active',
            'student_id' => $student->id,
        ]);

        Sanctum::actingAs($studentUser);

        $endpoints = [
            '/api/student/dashboard',
            '/api/student/attendance',
            '/api/student/exam-results',
            '/api/student/profile',
        ];

        foreach ($endpoints as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }
    }
}