<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\Message;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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

    public function test_transport_fee_collection_contract(): void
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

        $route = TransportRoute::query()->create([
            'organization_id' => $this->organization->id,
            'route_name' => 'Demo Route',
            'route_number' => 'R-001',
            'fare' => 500,
            'status' => 'active',
        ]);

        $assignment = TransportAssignment::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $student->id,
            'route_id' => $route->id,
            'pickup_point' => 'Main Road',
            'status' => 'active',
        ]);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $this->organization->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'fee_type' => 'Transport Fee - Demo Route / Main Road',
            'amount' => 1000,
            'frequency' => 'monthly',
        ]);

        $studentFee = StudentFee::query()->create([
            'organization_id' => $this->organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $feeStructure->id,
            'academic_year_id' => $academicYear->id,
            'month' => 'January',
            'year' => 2026,
            'amount' => 1000,
            'net_amount' => 1000,
            'paid_amount' => 0,
            'balance' => 1000,
            'due_date' => '2026-01-10',
            'transport_assignment_id' => $assignment->id,
            'status' => 'pending',
        ]);

        $list = $this->getJson('/api/transport/fee-collection')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'summary', 'classes']);

        $list->assertJsonCount(1, 'data');

        $payment = $this->postJson('/api/transport/fee-collection/payments', [
            'student_fee_id' => $studentFee->id,
            'amount' => 400,
            'payment_method' => 'upi',
        ])->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['id', 'receiptNumber', 'amount']]);

        $paymentId = $payment->json('data.id');

        $this->assertSame(600.0, (float) $studentFee->refresh()->balance);

        $this->postJson('/api/transport/fee-collection/payments/'.$paymentId.'/revert', [
            'reason' => 'Test revert',
        ])->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(1000.0, (float) $studentFee->refresh()->balance);
        $this->assertSame('refunded', FeePayment::findOrFail($paymentId)->status);
    }

    public function test_whatsapp_bridge_api_contracts(): void
    {
        Sanctum::actingAs($this->admin);

        Http::fake(['*' => Http::response(['status' => 'disconnected', 'account' => null, 'message' => 'ok'], 200)]);

        $status = $this->getJson('/api/communication/send-whatsapp/status')
            ->assertOk()
            ->assertJsonStructure(['configured', 'connected', 'status', 'queueWorkerStatus']);

        $this->getJson('/api/communication/send-whatsapp')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => []]);

        $this->postJson('/api/communication/send-whatsapp', [
            'audience_type' => 'staff',
            'staff_roles' => [],
            'subject' => 'Test campaign',
            'message' => 'Hello staff',
        ])->assertStatus(422)
            ->assertJsonPath('success', false);

        $message = Message::query()->create([
            'organization_id' => $this->organization->id,
            'sender_id' => $this->admin->id,
            'subject' => 'Old campaign',
            'message' => 'Old content',
            'attachments' => [
                'channel' => 'whatsapp',
                'whatsapp' => [
                    'recipient_summary' => 'All Staff',
                    'recipient_count' => 1,
                    'recipient_numbers' => ['9999999999'],
                    'status' => 'sent',
                    'successful_count' => 1,
                    'failed_count' => 0,
                    'pending_count' => 0,
                ],
            ],
            'priority' => 'normal',
            'is_announcement' => false,
        ]);

        $this->deleteJson('/api/communication/send-whatsapp/'.$message->id)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('messages', ['id' => $message->id]);
    }

    public function test_versioned_api_prefix_aliases_unversioned_api(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@gurukul.test',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role'], 'token']);

        Sanctum::actingAs($this->admin);

        foreach (['/api/v1/auth/user', '/api/v1/todo', '/api/v1/sessions', '/api/v1/knowledge-base', '/api/v1/roles/permissions'] as $endpoint) {
            $this->getJson($endpoint)->assertOk($endpoint);
        }

        $this->getJson('/api/v1/transport/fee-collection')->assertOk();
        $this->getJson('/api/v1/communication/send-whatsapp/status')->assertOk();
    }

    public function test_trailing_slash_paths_resolve(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/knowledge-base/')->assertOk();
        $this->getJson('/api/v1/knowledge-base/')->assertOk();
        $this->getJson('/api/sessions/')->assertOk();
        $this->getJson('/api/v1/sessions/')->assertOk();
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