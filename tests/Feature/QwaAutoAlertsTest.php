<?php

namespace Tests\Feature;

use App\Jobs\SendQwaWhatsappMessageJob;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryStore;
use App\Models\InventorySupplier;
use App\Models\Message;
use App\Models\Organization;
use App\Models\QwaAutoAlertLog;
use App\Models\QwaAutoAlertRule;
use App\Models\QwaWhatsappTemplate;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\Subject;
use App\Models\User;
use App\Services\Approvals\ApprovalEngine;
use App\Services\QwaAutoAlertService;
use App\Services\QwaRegionalTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class QwaAutoAlertsTest extends TestCase
{
    use RefreshDatabase;

    private function createOrganizationAndAdmin(bool $autoAlertsOn = false): array
    {
        $organization = Organization::query()->create([
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
            'settings' => [
                'communication_settings' => [
                    'qwa' => [
                        'enabled' => true,
                        'baseUrl' => 'https://qwa.qodeigence.com',
                        'apiKey' => encrypt('test-api-key'),
                        'sessionId' => 'test-session',
                        'auto_alerts_enabled' => $autoAlertsOn,
                    ],
                ],
            ],
        ]);

        $user = User::factory()->create([
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
        ]);

        $academicYear = AcademicYear::query()->create([
            'organization_id' => $organization->id,
            'name' => '2026-2027',
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
            'is_current' => true,
            'status' => 'active',
        ]);

        $student = Student::query()->create([
            'organization_id' => $organization->id,
            'admission_no' => 'ADM-1001',
            'roll_number' => '5',
            'first_name' => 'Aarav',
            'last_name' => 'Mehta',
            'date_of_birth' => '2012-03-15',
            'gender' => 'male',
            'admission_date' => '2026-04-10',
            'father_name' => 'Rajesh Mehta',
            'father_phone' => '9876543210',
            'phone' => '9876543210',
            'status' => 'active',
        ]);

        StudentAcademicHistory::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'is_current' => true,
            'entry_type' => 'new',
            'effective_date' => '2026-04-01',
        ]);

        return [$organization, $user, $student];
    }

    private function fakeConnectedSession(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session' => Http::response(['status' => 'ready'], 200),
        ]);
    }

    private function createTemplate(Organization $organization, string $body = 'Dear {{name}}, paid {{total_paid}}, balance {{balance}}.', array $mapping = []): QwaWhatsappTemplate
    {
        return QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-fee-1',
            'name' => 'Fee Receipt Alert',
            'body' => $body,
            'header' => 'Gurukul School',
            'footer' => 'Regards',
            'placeholders' => QwaWhatsappTemplate::parsePlaceholders($body),
            'mapping' => $mapping ?: ['name' => 'student_name', 'total_paid' => 'total_paid', 'balance' => 'student_overall_balance_due'],
            'action_toggles' => [],
        ]);
    }

    private function createRule(Organization $organization, QwaWhatsappTemplate $template, string $trigger = 'fee_payment_received', array $overrides = []): QwaAutoAlertRule
    {
        return QwaAutoAlertRule::query()->create(array_replace([
            'organization_id' => $organization->id,
            'qwa_template_id' => $template->id,
            'trigger_event' => $trigger,
            'enabled' => true,
            'recipient_type' => 'parents',
            'recipient_roles' => ['admin'],
            'schedule_time' => null,
        ], $overrides));
    }

    private function createSchoolClass(Organization $organization, string $name = 'V', string $section = 'B'): SchoolClass
    {
        $year = AcademicYear::query()->where('organization_id', $organization->id)->firstOrFail();

        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'name' => $name,
            'section' => $section,
        ]);
    }

    private function createStudentFee(Organization $organization, Student $student, array $overrides = []): StudentFee
    {
        $year = AcademicYear::query()->where('organization_id', $organization->id)->firstOrFail();

        $schoolClass = $this->createSchoolClass($organization);

        $feeStructure = FeeStructure::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $year->id,
            'class_id' => $schoolClass->id,
            'fee_type' => 'tuition',
            'amount' => 10000,
        ]);

        return StudentFee::query()->create(array_replace([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'fee_structure_id' => $feeStructure->id,
            'academic_year_id' => $year->id,
            'year' => 2026,
            'amount' => 10000,
            'discount' => 0,
            'fine' => 0,
            'net_amount' => 10000,
            'paid_amount' => 0,
            'balance' => 10000,
            'due_date' => now()->toDateString(),
            'status' => 'partial',
        ], $overrides));
    }

    public function test_custom_template_can_be_created_and_is_fallback_only(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $response = $this->actingAs($user)->post('/communication/qwa-alerts/templates', [
            'name' => 'My Local Alert',
            'body' => 'Hi {{student_name}}, you paid {{total_paid}} today.',
            'header' => 'Gurukul',
            'footer' => 'Thank you',
        ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $template = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('is_custom', true)
            ->firstOrFail();

        $this->assertSame('My Local Alert', $template->name);
        $this->assertSame(['student_name', 'total_paid'], $template->placeholders);
        $this->assertSame('student_name', $template->mapping['student_name']);
        $this->assertSame('total_paid', $template->mapping['total_paid']);
        $this->assertNull($template->qwa_template_id);
        $this->assertFalse($template->canSendNatively());
    }

    public function test_custom_template_cannot_be_deleted_while_referenced_by_a_rule(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $template = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'custom',
            'qwa_template_id' => null,
            'is_custom' => true,
            'name' => 'Local',
            'body' => 'Hi {{name}}.',
            'placeholders' => ['name'],
            'mapping' => ['name' => 'student_name'],
            'action_toggles' => [],
        ]);

        $this->createRule($organization, $template);

        $response = $this->actingAs($user)->delete("/communication/qwa-alerts/templates/{$template->id}");

        $response->assertSessionHasErrors('qwa_template');
        $this->assertDatabaseHas('qwa_whatsapp_templates', ['id' => $template->id]);
    }

    public function test_custom_template_can_be_deleted_when_unused(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $template = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'custom',
            'qwa_template_id' => null,
            'is_custom' => true,
            'name' => 'Local',
            'body' => 'Hi {{name}}.',
            'placeholders' => ['name'],
            'mapping' => ['name' => 'student_name'],
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)->delete("/communication/qwa-alerts/templates/{$template->id}");

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('qwa_whatsapp_templates', ['id' => $template->id]);
    }

    public function test_rule_crud_endpoints(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $template = $this->createTemplate($organization);

        $response = $this->actingAs($user)->post('/communication/qwa-alerts/rules', [
            'qwaTemplateId' => $template->id,
            'triggerEvent' => 'fee_payment_received',
            'enabled' => true,
            'recipientType' => 'roles',
            'recipientRoles' => ['admin', 'accountant'],
            'scheduleTime' => null,
        ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $rule = QwaAutoAlertRule::query()->where('organization_id', $organization->id)->firstOrFail();
        $this->assertSame('fee_payment_received', $rule->trigger_event);
        $this->assertSame(['admin', 'accountant'], $rule->recipient_roles);
        $this->assertTrue($rule->enabled);

        // Duplicates are rejected.
        $duplicate = $this->actingAs($user)->post('/communication/qwa-alerts/rules', [
            'qwaTemplateId' => $template->id,
            'triggerEvent' => 'fee_payment_received',
            'enabled' => false,
            'recipientType' => 'parents',
        ]);
        $duplicate->assertSessionHasErrors('qwa_auto_alert');
        $this->assertSame(1, QwaAutoAlertRule::query()->count());

        // Update.
        $update = $this->actingAs($user)->patch("/communication/qwa-alerts/rules/{$rule->id}", [
            'enabled' => false,
            'recipientType' => 'parents',
            'recipientRoles' => [],
            'scheduleTime' => null,
        ]);
        $update->assertRedirect('/communication/send-qwa-whatsapp');
        $rule->refresh();
        $this->assertFalse($rule->enabled);
        $this->assertSame('parents', $rule->recipient_type);

        // Delete.
        $delete = $this->actingAs($user)->delete("/communication/qwa-alerts/rules/{$rule->id}");
        $delete->assertRedirect('/communication/send-qwa-whatsapp');
        $this->assertSame(0, QwaAutoAlertRule::query()->count());
    }

    public function test_master_toggle_updates_settings(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin(false);

        $response = $this->actingAs($user)->patch('/communication/qwa-alerts/settings', ['enabled' => true]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $organization->refresh();
        $this->assertTrue((bool) $organization->settings['communication_settings']['qwa']['auto_alerts_enabled']);
    }

    public function test_event_dispatch_queues_and_deduplicates(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(true);
        $template = $this->createTemplate($organization);
        $rule = $this->createRule($organization, $template);

        $studentFee = $this->createStudentFee($organization, $student, ['paid_amount' => 0, 'balance' => 10000]);

        $payment = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $student->id,
            'receipt_number' => 'RCT-1001',
            'amount' => 5000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'status' => 'success',
            'collected_by' => $user->id,
        ]);

        $service = app(QwaAutoAlertService::class);
        $service->dispatch($organization, 'fee_payment_received', [
            'payment' => $payment,
            'student' => $student->load('schoolClass'),
            'student_fee' => $studentFee,
        ]);

        $service->dispatch($organization, 'fee_payment_received', [
            'payment' => $payment,
            'student' => $student->load('schoolClass'),
            'student_fee' => $studentFee,
        ]);

        $this->assertSame(1, QwaAutoAlertLog::query()->count());
        $this->assertDatabaseHas('qwa_auto_alert_log', [
            'rule_id' => $rule->id,
            'event_key' => 'student:'.$student->id.':payment:RCT-1001',
            'recipient_phone' => '919876543210',
        ]);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $message = Message::query()->firstOrFail();
        $meta = $message->attachments['qwa_whatsapp'];
        $this->assertTrue((bool) ($meta['is_automatic'] ?? false));
        $this->assertSame('fee_payment_received', $meta['auto_alert_trigger']);
        $this->assertSame((string) $rule->id, $meta['auto_alert_rule_id']);
        $this->assertSame('native', $meta['template_mode']);
        $this->assertSame('919876543210', $meta['recipients'][0]['phone']);
        $this->assertSame('5,000.00', $meta['recipients'][0]['template_vars']['total_paid']);

        $rule->refresh();
        $this->assertNotNull($rule->last_fired_at);
    }

    public function test_event_disabled_when_master_setting_is_off(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(false);
        $template = $this->createTemplate($organization);
        $this->createRule($organization, $template);

        $studentFee = $this->createStudentFee($organization, $student, ['paid_amount' => 0, 'balance' => 10000]);

        $payment = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $student->id,
            'receipt_number' => 'RCT-1001',
            'amount' => 5000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'status' => 'success',
            'collected_by' => $user->id,
        ]);

        app(QwaAutoAlertService::class)->dispatch($organization, 'fee_payment_received', [
            'payment' => $payment,
            'student' => $student,
            'student_fee' => $studentFee,
        ]);

        Queue::assertNothingPushed(SendQwaWhatsappMessageJob::class);
        $this->assertSame(0, Message::query()->count());
        $this->assertSame(0, QwaAutoAlertLog::query()->count());
    }

    public function test_event_dispatch_honours_role_based_recipients(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(true);
        $template = $this->createTemplate($organization);
        $rule = $this->createRule($organization, $template, 'fee_payment_received', [
            'recipient_type' => 'roles',
            'recipient_roles' => ['admin'],
        ]);

        $studentFee = $this->createStudentFee($organization, $student, ['paid_amount' => 0, 'balance' => 10000]);

        $payment = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $student->id,
            'receipt_number' => 'RCT-1002',
            'amount' => 5000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'status' => 'success',
            'collected_by' => $user->id,
        ]);

        $svc = app(QwaAutoAlertService::class);
        $svc->dispatch($organization, 'fee_payment_received', [
            'payment' => $payment,
            'student' => $student->load('schoolClass'),
            'student_fee' => $studentFee,
        ]);

        Queue::assertPushed(
            SendQwaWhatsappMessageJob::class,
            fn (SendQwaWhatsappMessageJob $job) => $this->jobArgument($job, 'phone') === '919999999999'
        );

        $message = Message::query()->firstOrFail();
        $this->assertSame('919999999999', $message->attachments['qwa_whatsapp']['recipients'][0]['phone']);
        $this->assertSame($rule->id, QwaAutoAlertLog::query()->firstOrFail()->rule_id);
    }

    public function test_scheduled_fee_due_scan_queues_and_remembers_the_day(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, , $student] = $this->createOrganizationAndAdmin(true);
        $template = $this->createTemplate($organization, 'Dear {{name}}, balance due {{balance}} for {{due_date}}.', [
            'name' => 'student_name',
            'balance' => 'student_overall_balance_due',
            'due_date' => 'due_date',
        ]);
        $rule = $this->createRule($organization, $template, 'fee_due', ['recipient_type' => 'parents']);

        $this->createStudentFee($organization, $student, ['paid_amount' => 3000, 'balance' => 7000, 'due_date' => now()->subDay()->toDateString()]);

        $service = app(QwaAutoAlertService::class);
        $service->runScheduled('fee_due', $organization->id);
        $service->runScheduled('fee_due', $organization->id);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $entry = QwaAutoAlertLog::query()->where('rule_id', $rule->id)->firstOrFail();
        $this->assertStringContainsString('student:'.$student->id.':fee:', $entry->event_key);
        $this->assertSame('919876543210', $entry->recipient_phone);
    }

    public function test_test_send_dispatches_job_to_provided_number(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $template = $this->createTemplate($organization);

        $response = $this->actingAs($user)->post('/communication/qwa-alerts/test-send', [
            'qwaTemplateId' => $template->id,
            'phone' => '9876543210',
            'triggerEvent' => '',
        ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        Queue::assertPushed(
            SendQwaWhatsappMessageJob::class,
            fn (SendQwaWhatsappMessageJob $job) => $this->jobArgument($job, 'phone') === '919876543210'
        );

        $message = Message::query()->firstOrFail();
        $this->assertTrue((bool) ($message->attachments['qwa_whatsapp']['is_test_send'] ?? false));
    }

    public function test_custom_template_resolve_vars_prefers_rich_context(): void
    {
        $template = new QwaWhatsappTemplate([
            'is_custom' => true,
            'placeholders' => ['name', 'total_paid', 'class'],
            'mapping' => ['name' => 'student_name', 'total_paid' => 'total_paid', 'class' => 'class_section'],
        ]);

        $vars = $template->resolveVars([
            'student_name' => 'Aarav Mehta',
            'class_section' => 'V - B',
            'total_paid' => '4,500.00',
            'name' => 'Ignored Name',
            'phone' => '919999999999',
        ]);

        $this->assertSame('Aarav Mehta', $vars['name']);
        $this->assertSame('4,500.00', $vars['total_paid']);
        $this->assertSame('V - B', $vars['class']);
    }

    public function test_render_body_strips_leftover_unmapped_tokens(): void
    {
        $template = new QwaWhatsappTemplate([
            'body' => 'Hi {{name}}. Outstanding {{balance}} and {{unknown_tag}}.',
        ]);

        $rendered = $template->renderBody(['name' => 'Sam', 'balance' => '500']);

        $this->assertSame('Hi Sam. Outstanding 500 and .', $rendered);
        $this->assertStringNotContainsString('{{unknown_tag}}', $rendered);
    }

    public function test_scheduled_attendance_absent_scan_pings_guardians(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(true);
        $schoolClass = $this->createSchoolClass($organization);
        $template = $this->createTemplate($organization, 'Dear {{name}}, {{child_name}} was absent on {{attendance_date}}. {{attendance_remarks}}', [
            'name' => 'guardian_name',
            'child_name' => 'student_name',
            'attendance_date' => 'attendance_date',
            'attendance_remarks' => 'attendance_remarks',
        ]);
        $rule = $this->createRule($organization, $template, 'attendance_absent');

        Attendance::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $student->id,
            'class_id' => $schoolClass->id,
            'date' => now()->toDateString(),
            'status' => 'absent',
            'remarks' => 'Fever',
            'marked_by' => $user->id,
        ]);

        app(QwaAutoAlertService::class)->runScheduled('attendance_absent', $organization->id);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $entry = QwaAutoAlertLog::query()->where('rule_id', $rule->id)->firstOrFail();
        $this->assertStringContainsString('student:'.$student->id.':absent:'.now()->format('Y-m-d'), $entry->event_key);
        $this->assertSame('919876543210', $entry->recipient_phone);
    }

    public function test_exam_results_published_event_pings_parents_of_exam_classes(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, , $student] = $this->createOrganizationAndAdmin(true);
        $schoolClass = $this->createSchoolClass($organization);
        $student->update(['class_id' => $schoolClass->id]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'type' => 'theory',
        ]);

        $academicYear = AcademicYear::query()->where('organization_id', $organization->id)->firstOrFail();
        $exam = Exam::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'First Term',
            'exam_type' => 'general',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'publish_status' => 'draft',
        ]);

        ExamSchedule::query()->create([
            'exam_id' => $exam->id,
            'class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'exam_date' => now()->addDay()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
        ]);

        $template = $this->createTemplate($organization, 'Dear {{name}}, results of {{exam_name}} are out.', [
            'name' => 'guardian_name',
            'exam_name' => 'exam_name',
        ]);
        $rule = $this->createRule($organization, $template, 'exam_results_published');

        app(QwaAutoAlertService::class)->dispatch($organization, 'exam_results_published', ['exam' => $exam]);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $entry = QwaAutoAlertLog::query()->where('rule_id', $rule->id)->firstOrFail();
        $this->assertStringContainsString('student:'.$student->id.':exam:'.$exam->id.':published', $entry->event_key);
        $this->assertSame('919876543210', $entry->recipient_phone);
    }

    public function test_scheduled_inventory_low_stock_scan_alerts_staff_roles(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, , ] = $this->createOrganizationAndAdmin(true);
        $template = $this->createTemplate($organization, '{{alert_subject}}: {{alert_message}}', [
            'alert_subject' => 'alert_subject',
            'alert_message' => 'alert_message',
        ]);
        $rule = $this->createRule($organization, $template, 'inventory_low_stock', [
            'recipient_type' => 'roles',
            'recipient_roles' => ['admin'],
        ]);

        $category = InventoryCategory::query()->create(['organization_id' => $organization->id, 'name' => 'Stationery']);
        $store = InventoryStore::query()->create(['organization_id' => $organization->id, 'name' => 'Main Store', 'manager' => 'Store Manager']);
        $supplier = InventorySupplier::query()->create(['organization_id' => $organization->id, 'name' => 'ABC Supplies', 'contact_person' => 'Sales Desk']);

        InventoryItem::query()->create([
            'organization_id' => $organization->id,
            'inventory_category_id' => $category->id,
            'inventory_store_id' => $store->id,
            'inventory_supplier_id' => $supplier->id,
            'name' => 'A4 Paper',
            'available_stock' => 2,
            'minimum_stock' => 5,
        ]);

        InventoryItem::query()->create([
            'organization_id' => $organization->id,
            'inventory_category_id' => $category->id,
            'inventory_store_id' => $store->id,
            'inventory_supplier_id' => $supplier->id,
            'name' => 'Pens',
            'available_stock' => 20,
            'minimum_stock' => 5,
        ]);

        app(QwaAutoAlertService::class)->runScheduled('inventory_low_stock', $organization->id);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $entry = QwaAutoAlertLog::query()->where('rule_id', $rule->id)->firstOrFail();
        $this->assertStringContainsString('inventory:low_stock', $entry->event_key);
        $this->assertSame('919999999999', $entry->recipient_phone);

        $message = Message::query()->firstOrFail();
        $meta = $message->attachments['qwa_whatsapp'];
        $this->assertSame('Low stock alert: 1 item(s)', $meta['recipients'][0]['template_vars']['alert_subject']);
        $this->assertStringContainsString('A4 Paper', $meta['recipients'][0]['template_vars']['alert_message']);
    }

    private function jobArgument(SendQwaWhatsappMessageJob $job, string $property): mixed
    {
        $reflection = new \ReflectionClass($job);
        $property = $reflection->getProperty($property);

        return $property->getValue($job);
    }

    public function test_forced_rule_language_dispatches_the_regional_variant(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(true);

        $base = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-fee-receipt',
            'name' => 'Fee Receipt Confirmation',
            'language' => 'en',
            'variant_key' => 'fee_receipt',
            'body' => 'Dear {{name}}, paid {{total_paid}}, balance {{balance}}.',
            'placeholders' => ['name', 'total_paid', 'balance'],
            'mapping' => [
                'name' => 'student_name',
                'total_paid' => 'total_paid',
                'balance' => 'student_overall_balance_due',
            ],
            'action_toggles' => [],
        ]);

        app(QwaRegionalTemplateService::class)->ensureRegionalVariant($organization->id, 'fee_receipt', 'mr');

        app(QwaAutoAlertRule::class)->query()->create([
            'organization_id' => $organization->id,
            'qwa_template_id' => $base->id,
            'trigger_event' => 'fee_payment_received',
            'enabled' => true,
            'recipient_type' => 'parents',
            'recipient_roles' => ['admin'],
            'schedule_time' => null,
            'language' => 'mr',
        ]);

        $studentFee = $this->createStudentFee($organization, $student, ['paid_amount' => 5000, 'balance' => 5000]);

        $payment = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $student->id,
            'receipt_number' => 'RCT-2002',
            'amount' => 5000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'status' => 'success',
            'collected_by' => $user->id,
        ]);

        app(QwaAutoAlertService::class)->dispatch($organization, 'fee_payment_received', [
            'payment' => $payment,
            'student' => $student->load('schoolClass'),
            'student_fee' => $studentFee,
        ]);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);
        Queue::assertPushed(
            SendQwaWhatsappMessageJob::class,
            fn (SendQwaWhatsappMessageJob $job) => $this->jobArgument($job, 'templateQwaId') === null
                && $this->jobArgument($job, 'templateMode') === 'fallback'
        );

        $meta = Message::query()->firstOrFail()->attachments['qwa_whatsapp'];

        $this->assertSame('mr', $meta['template_language']);
        $this->assertSame('mr', $meta['recipients'][0]['template_language']);
        $this->assertSame('fallback', $meta['recipients'][0]['template_mode']);
        $this->assertStringContainsString('पावती', (string) $meta['recipients'][0]['rendered_text']);
    }

    public function test_auto_rule_language_uses_the_recipient_preferred_language(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(true);

        $student->forceFill(['preferred_language' => 'hi'])->save();

        $base = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-fee-receipt',
            'name' => 'Fee Receipt Confirmation',
            'language' => 'en',
            'variant_key' => 'fee_receipt',
            'body' => 'Dear {{name}}, paid {{total_paid}}, balance {{balance}}.',
            'placeholders' => ['name', 'total_paid', 'balance'],
            'mapping' => [
                'name' => 'student_name',
                'total_paid' => 'total_paid',
                'balance' => 'student_overall_balance_due',
            ],
            'action_toggles' => [],
        ]);

        app(QwaRegionalTemplateService::class)->ensureRegionalVariant($organization->id, 'fee_receipt', 'mr');
        app(QwaRegionalTemplateService::class)->ensureRegionalVariant($organization->id, 'fee_receipt', 'hi');

        app(QwaAutoAlertRule::class)->query()->create([
            'organization_id' => $organization->id,
            'qwa_template_id' => $base->id,
            'trigger_event' => 'fee_payment_received',
            'enabled' => true,
            'recipient_type' => 'parents',
            'recipient_roles' => ['admin'],
            'schedule_time' => null,
            'language' => 'auto',
        ]);

        $studentFee = $this->createStudentFee($organization, $student, ['paid_amount' => 5000, 'balance' => 5000]);

        $payment = FeePayment::query()->create([
            'organization_id' => $organization->id,
            'student_fee_id' => $studentFee->id,
            'student_id' => $student->id,
            'receipt_number' => 'RCT-3003',
            'amount' => 5000,
            'payment_method' => 'cash',
            'payment_date' => now()->toDateString(),
            'status' => 'success',
            'collected_by' => $user->id,
        ]);

        app(QwaAutoAlertService::class)->dispatch($organization, 'fee_payment_received', [
            'payment' => $payment,
            'student' => $student->load('schoolClass'),
            'student_fee' => $studentFee,
        ]);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $meta = Message::query()->firstOrFail()->attachments['qwa_whatsapp'];

        $this->assertSame('auto', $meta['template_language']);
        $this->assertSame('hi', $meta['recipients'][0]['template_language']);
        $this->assertStringContainsString('हमें', (string) $meta['recipients'][0]['rendered_text']);
    }

    public function test_approval_request_event_alerts_staff_roles(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user, $student] = $this->createOrganizationAndAdmin(true);
        $template = $this->createTemplate($organization, '{{alert_subject}}: {{alert_message}}', [
            'alert_subject' => 'alert_subject',
            'alert_message' => 'alert_message',
        ]);
        $rule = $this->createRule($organization, $template, 'approval_request', [
            'recipient_type' => 'roles',
            'recipient_roles' => ['admin'],
        ]);

        $engine = app(ApprovalEngine::class);
        $request = $engine->submit('hostel_allotment', $user, $student, 'Hostel room assignment needs approval.');

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);

        $this->assertDatabaseHas('qwa_auto_alert_log', [
            'rule_id' => $rule->id,
            'event_key' => 'approval_request:'.$request->id.':pending',
            'recipient_phone' => '919999999999',
        ]);

        $engine->approve($request, $user);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 2);
        $this->assertDatabaseHas('qwa_auto_alert_log', [
            'rule_id' => $rule->id,
            'event_key' => 'approval_request:'.$request->id.':approved',
        ]);
    }
}