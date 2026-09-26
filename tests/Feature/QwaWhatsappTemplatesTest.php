<?php

namespace Tests\Feature;

use App\Jobs\SendQwaWhatsappMessageJob;
use App\Models\AcademicYear;
use App\Models\Message;
use App\Models\Organization;
use App\Models\QwaWhatsappTemplate;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\User;
use App\Services\QwaRegionalTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use ReflectionClass;
use Tests\TestCase;

class QwaWhatsappTemplatesTest extends TestCase
{
    use RefreshDatabase;

    private function createOrganizationAndAdmin(): array
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

        return [$organization, $user];
    }

    private function fakeConnectedSession(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session' => Http::response(['status' => 'ready'], 200),
        ]);
    }

    public function test_admin_can_sync_qwa_templates_into_the_database(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/templates' => Http::response([
                [
                    'id' => 'wa-template-1',
                    'name' => 'Fee Reminder',
                    'body' => 'Dear {{name}}, your balance is {{balance}}. Class: {{class}}. OTP {{1}}',
                    'header' => 'Gurukul School',
                    'footer' => 'Regards',
                    'media' => [],
                ],
                [
                    'id' => 'wa-template-2',
                    'name' => 'Holiday Notice',
                    'body' => 'School remains closed on {{date}} for {{student_name}}.',
                ],
            ], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync');

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success', '2 QWA template(s) synced: 2 added and 0 updated.');

        $this->assertDatabaseCount('qwa_whatsapp_templates', 2);

        $template = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('qwa_template_id', 'wa-template-1')
            ->firstOrFail();

        $this->assertSame('Fee Reminder', $template->name);
        $this->assertSame('test-session', $template->session_id);
        $this->assertSame(['name', 'balance', 'class', '1'], $template->placeholders);
        $this->assertSame('student_name', $template->mapping['name']);
        $this->assertSame('student_overall_balance_due', $template->mapping['balance']);
        $this->assertSame('class', $template->mapping['class']);
        $this->assertArrayNotHasKey('1', $template->mapping);
        $this->assertNotNull($template->last_synced_at);

        $fallback = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('qwa_template_id', 'wa-template-2')
            ->firstOrFail();

        $this->assertSame(['date', 'student_name'], $fallback->placeholders);
        $this->assertSame('current_date', $fallback->mapping['date']);
        $this->assertTrue($fallback->canSendNatively());
    }

    public function test_sync_preserves_existing_mapping_for_updated_templates(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/templates' => Http::response([
                [
                    'id' => 'wa-template-1',
                    'name' => 'Fee Reminder',
                    'body' => 'Dear {{name}}, your balance is {{balance}}.',
                    'header' => '',
                    'footer' => '',
                ],
            ], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-template-1',
            'name' => 'Old Fee Reminder',
            'body' => 'Dear {{name}}, your balance is {{balance}}.',
            'placeholders' => ['name', 'balance'],
            'mapping' => ['name' => 'father_name', 'balance' => ''],
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync');

        $response->assertSessionHas('success', '1 QWA template(s) synced: 0 added and 1 updated.');
        $this->assertDatabaseCount('qwa_whatsapp_templates', 1);

        $template = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('qwa_template_id', 'wa-template-1')
            ->firstOrFail();

        $this->assertSame('Fee Reminder', $template->name);
        $this->assertSame('father_name', $template->mapping['name']);
        $this->assertSame('', $template->mapping['balance']);
    }

    public function test_sync_is_blocked_when_qwa_is_not_configured(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $organization->forceFill([
            'settings' => [
                'communication_settings' => [
                    'qwa' => ['baseUrl' => '', 'apiKey' => '', 'sessionId' => ''],
                ],
            ],
        ])->save();

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync');

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHasErrors('qwa_templates');
        $this->assertSame(0, QwaWhatsappTemplate::query()->count());
        Http::assertNothingSent();
    }

    public function test_admin_can_update_placeholder_mapping(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $template = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-template-1',
            'name' => 'Fee Reminder',
            'body' => 'Dear {{name}}, balance {{balance}} and otp {{1}}.',
            'placeholders' => ['name', 'balance', '1'],
            'mapping' => ['name' => 'student_name', 'balance' => ''],
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)
            ->put("/communication/send-qwa-whatsapp/templates/{$template->id}", [
                'mapping' => [
                    'name' => 'father_name',
                    'balance' => 'student_overall_balance_due',
                    '1' => 'student_name',
                    'unknown' => 'class',
                ],
            ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $template->refresh();

        $this->assertSame('father_name', $template->mapping['name']);
        $this->assertSame('student_overall_balance_due', $template->mapping['balance']);
        $this->assertArrayNotHasKey('1', $template->mapping);
        $this->assertArrayNotHasKey('unknown', $template->mapping);
    }

    public function test_update_rejects_non_array_mapping(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $template = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-template-1',
            'name' => 'Fee Reminder',
            'body' => 'Hello {{name}}.',
            'placeholders' => ['name'],
            'mapping' => ['name' => 'student_name'],
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)
            ->put("/communication/send-qwa-whatsapp/templates/{$template->id}", [
                'mapping' => 'not-an-array',
            ]);

        $response->assertSessionHasErrors('mapping');
        $template->refresh();
        $this->assertSame(['name' => 'student_name'], $template->mapping);
    }

    public function test_store_with_native_template_queues_send_template_jobs(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $template = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-template-1',
            'name' => 'Fee Reminder',
            'body' => 'Dear {{name}}, your balance is {{balance}}.',
            'header' => 'Gurukul School',
            'footer' => 'Regards',
            'placeholders' => ['name', 'balance'],
            'mapping' => ['name' => 'student_name', 'balance' => 'student_overall_balance_due'],
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp', [
            'audienceType' => 'students',
            'selectedStaffRoles' => [],
            'selectedGroups' => [],
            'subject' => 'Fee Reminder',
            'content' => 'See attached.',
            'messageType' => 'text',
            'templateId' => (string) $template->id,
            'templateVars' => [],
        ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $message = Message::query()->firstOrFail();
        $meta = $message->attachments['qwa_whatsapp'];

        $this->assertSame('queued', $meta['status']);
        $this->assertSame((string) $template->id, $meta['template_id']);
        $this->assertSame('wa-template-1', $meta['template_qwa_id']);
        $this->assertSame('native', $meta['template_mode']);
        $this->assertSame('text', $meta['message_type']);
        $this->assertSame('Aarav Mehta', $meta['recipients'][0]['name']);
        $this->assertSame('919876543210', $meta['recipients'][0]['phone']);
        $this->assertSame('Aarav Mehta', $meta['recipients'][0]['template_vars']['name']);
        $this->assertSame('', $meta['recipients'][0]['template_vars']['balance']);
        $this->assertNull($meta['recipients'][0]['rendered_text']);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);
        Queue::assertPushed(
            SendQwaWhatsappMessageJob::class,
            fn (SendQwaWhatsappMessageJob $job) => $this->jobArgument($job, 'templateQwaId') === 'wa-template-1'
                && $this->jobArgument($job, 'templateMode') === 'native'
        );
    }

    public function test_store_with_fallback_template_renders_text_per_recipient(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $template = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-otp-1',
            'name' => 'OTP Message',
            'body' => 'Your one-time password is {{1}}. It is valid for {{2}} minutes.',
            'placeholders' => ['1', '2'],
            'mapping' => [],
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp', [
            'audienceType' => 'students',
            'selectedStaffRoles' => [],
            'selectedGroups' => [],
            'subject' => 'OTP Message',
            'content' => 'See attached.',
            'messageType' => 'text',
            'templateId' => (string) $template->id,
            'templateVars' => ['1' => '482913', '2' => '10'],
        ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $message = Message::query()->firstOrFail();
        $meta = $message->attachments['qwa_whatsapp'];

        $this->assertSame('fallback', $meta['template_mode']);
        $this->assertSame('wa-otp-1', $meta['template_qwa_id']);
        $this->assertSame(
            'Your one-time password is 482913. It is valid for 10 minutes.',
            $meta['recipients'][0]['rendered_text']
        );
        $this->assertSame('482913', $meta['recipients'][0]['template_vars']['1']);
        $this->assertSame('10', $meta['recipients'][0]['template_vars']['2']);

        Queue::assertPushed(
            SendQwaWhatsappMessageJob::class,
            fn (SendQwaWhatsappMessageJob $job) => $this->jobArgument($job, 'messageText') === 'Your one-time password is 482913. It is valid for 10 minutes.'
        );
    }

    public function test_job_uses_native_send_template_endpoint_when_mode_is_native(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/messages/send-template' => Http::response(['status' => 'sent'], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $message = $this->createTemplateMessage($organization, $user, 'native', 'wa-template-1');

        (new SendQwaWhatsappMessageJob(
            $message->id,
            $organization->id,
            0,
            'Tejas',
            '919021446889',
            'Prepared text, unused for native delivery.',
            'text',
            null,
            null,
            null,
            null,
            'wa-template-1',
            'native',
            ['name' => 'Tejas', 'balance' => '5000'],
        ))->handle(app(\App\Services\QwaService::class));

        Http::assertSent(function ($request) {
            return $request->url() === 'https://qwa.qodeigence.com/api/sessions/test-session/messages/send-template'
                && $request['chatId'] === '919021446889@c.us'
                && $request['templateId'] === 'wa-template-1'
                && $request['vars']['name'] === 'Tejas'
                && $request['vars']['balance'] === '5000';
        });

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/messages/send-text'));

        $message->refresh();
        $this->assertSame('sent', $message->attachments['qwa_whatsapp']['recipients'][0]['status']);
        $this->assertSame(1, $message->attachments['qwa_whatsapp']['successful_count']);
    }

    public function test_job_falls_back_to_send_text_for_rendered_templates(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/messages/send-text' => Http::response(['status' => 'sent'], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $message = $this->createTemplateMessage($organization, $user, 'fallback', 'wa-otp-1');

        (new SendQwaWhatsappMessageJob(
            $message->id,
            $organization->id,
            0,
            'Tejas',
            '919021446889',
            'Your one-time password is 482913.',
            'text',
            null,
            null,
            null,
            null,
            'wa-otp-1',
            'fallback',
            ['1' => '482913'],
        ))->handle(app(\App\Services\QwaService::class));

        Http::assertSent(function ($request) {
            return $request->url() === 'https://qwa.qodeigence.com/api/sessions/test-session/messages/send-text'
                && $request['chatId'] === '919021446889@c.us'
                && $request['text'] === 'Your one-time password is 482913.';
        });

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/messages/send-template'));

        $message->refresh();
        $this->assertSame('sent', $message->attachments['qwa_whatsapp']['recipients'][0]['status']);
    }

    public function test_placeholder_parsing_handles_named_and_positional_tokens(): void
    {
        $parsed = QwaWhatsappTemplate::parsePlaceholders('Hi {{name}} of {{class}}, again {{ name }}');
        $this->assertSame(['name', 'class'], $parsed);

        $parsed = QwaWhatsappTemplate::parsePlaceholders('OTP {{1}} then {{2}} and {{1}}');
        $this->assertSame(['1', '2'], $parsed);

        $this->assertTrue(QwaWhatsappTemplate::isNamedPlaceholder('student_name'));
        $this->assertTrue(QwaWhatsappTemplate::isNamedPlaceholder('name'));
        $this->assertFalse(QwaWhatsappTemplate::isNamedPlaceholder('1'));
        $this->assertFalse(QwaWhatsappTemplate::isNamedPlaceholder(''));
    }

    public function test_template_placeholders_include_header_and_footer_tokens(): void
    {
        $template = new QwaWhatsappTemplate([
            'header' => 'Dear {{parent_name}}, welcome {{ parent_name }}.',
            'body' => 'Hi {{student_name}}, fee due {{amount}} for {{student_name}}.',
            'footer' => 'Regards, {{school_name}}',
        ]);

        $this->assertSame(['parent_name', 'student_name', 'amount', 'school_name'], $template->placeholdersForText());

        $mapping = QwaWhatsappTemplate::defaultMapping($template->placeholdersForText());
        $this->assertSame('parent_name', $mapping['parent_name']);
        $this->assertSame('student_name', $mapping['student_name']);
        $this->assertSame('total_paid', $mapping['amount']);
        $this->assertSame('school_name', $mapping['school_name']);
    }

    public function test_render_substitutes_repeated_and_spaced_variables_across_all_sections(): void
    {
        $template = new QwaWhatsappTemplate([
            'header' => 'Greetings, {{school_name}}!',
            'body' => 'Dear {{parent_name}}, {{ student_name }} owes {{ amount }}. School: {{school_name}} {{school_name}}.',
            'footer' => 'Regards, {{school_name}}',
        ]);

        $html = $template->renderFullText([
            'school_name' => 'GPS',
            'parent_name' => 'Rajesh',
            'student_name' => 'Aarav',
            'amount' => '500',
        ]);

        $this->assertSame(4, substr_count($html, 'GPS'));
        $this->assertSame(1, substr_count($html, 'Rajesh'));
        $this->assertSame(1, substr_count($html, 'Aarav'));
        $this->assertSame(1, substr_count($html, '500'));
        $this->assertStringNotContainsString('{{', $html);
    }

    public function test_sync_includes_header_and_footer_tokens_in_placeholders_and_mapping(): void
    {
        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/templates' => Http::response([
                [
                    'id' => 'wa-template-9',
                    'name' => 'Admission Confirmation',
                    'body' => 'Admission of {{student_name}} in class {{class}} is confirmed.',
                    'header' => 'Dear {{parent_name}},',
                    'footer' => 'Regards, {{school_name}}',
                    'media' => [],
                ],
            ], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync');

        $template = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('qwa_template_id', 'wa-template-9')
            ->firstOrFail();

        $this->assertSame(['parent_name', 'student_name', 'class', 'school_name'], $template->placeholders);
        $this->assertSame('parent_name', $template->mapping['parent_name']);
        $this->assertSame('school_name', $template->mapping['school_name']);
        $this->assertTrue($template->canSendNatively());
    }

    public function test_admin_can_push_custom_templates_to_qwa(): void
    {
        $this->fakeConnectedSession();

        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/templates' => Http::response([
                'id' => 'wa-created-1',
                'sessionId' => 'test-session',
                'name' => 'Custom MR',
                'body' => 'नमस्कार',
            ], 201),
            'https://qwa.qodeigence.com/api/sessions/test-session/templates/*' => Http::response([
                'id' => 'wa-exists-1',
                'sessionId' => 'test-session',
                'name' => 'Custom HI',
                'body' => 'हैलो',
            ], 200),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'custom',
            'qwa_template_id' => null,
            'name' => 'Custom MR',
            'language' => 'mr',
            'is_custom' => true,
            'body' => 'नमस्कार',
            'header' => 'Header {{school_name}}',
            'action_toggles' => [],
        ]);

        $preexisting = QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'custom',
            'qwa_template_id' => 'wa-exists-1',
            'name' => 'Custom HI',
            'language' => 'hi',
            'is_custom' => true,
            'body' => 'हैलो',
            'footer' => 'Regards {{school_name}}',
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync-to-qwa');

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success', '2 custom template(s) pushed to QWA: 1 added and 1 updated.');

        $created = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('name', 'Custom MR')
            ->firstOrFail();

        $this->assertSame('wa-created-1', $created->qwa_template_id);
        $this->assertNotNull($created->last_synced_at);

        $preexisting->refresh();
        $this->assertSame('wa-exists-1', $preexisting->qwa_template_id);
        $this->assertNotNull($preexisting->last_synced_at);

        Http::assertSent(fn ($request) => $request->url() === 'https://qwa.qodeigence.com/api/sessions/test-session/templates'
            && $request->method() === 'POST'
            && $request['name'] === 'Custom MR'
            && $request['body'] === 'नमस्कार'
            && ($request['header'] ?? null) === 'Header {{school_name}}');

        Http::assertSent(fn ($request) => $request->url() === 'https://qwa.qodeigence.com/api/sessions/test-session/templates/wa-exists-1'
            && $request->method() === 'PUT'
            && ($request['footer'] ?? null) === 'Regards {{school_name}}');

        $created->update(['name' => 'Custom MR updated']);
        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync-to-qwa');

        $response->assertSessionHas('success', '2 custom template(s) pushed to QWA: 0 added and 2 updated.');
    }

    public function test_push_to_qwa_reports_gateway_failures(): void
    {
        $this->fakeConnectedSession();

        Http::fake([
            'https://qwa.qodeigence.com/api/sessions/test-session/templates*' => Http::response([
                'message' => 'A template with this name already exists.',
            ], 409),
        ]);

        [$organization, $user] = $this->createOrganizationAndAdmin();

        QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'custom',
            'name' => 'Custom MR',
            'language' => 'mr',
            'is_custom' => true,
            'body' => 'नमस्कार',
            'action_toggles' => [],
        ]);

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp/templates/sync-to-qwa');

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHasErrors('qwa_templates');
    }

    public function test_can_send_natively_only_when_all_placeholders_are_named(): void
    {
        $named = new QwaWhatsappTemplate([
            'qwa_template_id' => 'wa-1',
            'placeholders' => ['name', 'balance'],
        ]);
        $this->assertTrue($named->canSendNatively());

        $positional = new QwaWhatsappTemplate([
            'qwa_template_id' => 'wa-1',
            'placeholders' => ['name', '1'],
        ]);
        $this->assertFalse($positional->canSendNatively());

        $missingId = new QwaWhatsappTemplate([
            'qwa_template_id' => '',
            'placeholders' => ['name'],
        ]);
        $this->assertFalse($missingId->canSendNatively());
    }

    public function test_default_mapping_maps_known_tokens_aliases_and_leaves_unknown_empty(): void
    {
        $mapping = QwaWhatsappTemplate::defaultMapping(['student_name', 'class', 'name', 'phone', 'section', 'nonsense', '1']);

        $this->assertSame('student_name', $mapping['student_name']);
        $this->assertSame('class', $mapping['class']);
        $this->assertSame('student_name', $mapping['name']);
        $this->assertSame('phone', $mapping['phone']);
        $this->assertSame('section', $mapping['section']);
        $this->assertSame('', $mapping['nonsense']);
        $this->assertArrayNotHasKey('1', $mapping);
    }

    public function test_default_mapping_auto_maps_new_template_placeholders_to_catalog_tokens(): void
    {
        $mapping = QwaWhatsappTemplate::defaultMapping([
            'academic_year',
            'meeting_date', 'meeting_time', 'venue',
            'holiday_date', 'holiday_reason', 'resume_date',
            'stop_name', 'arrival_time',
            'marks_obtained', 'total_marks',
            'homework_details', 'submission_date',
            'attendance_status', 'due_date',
        ]);

        foreach ([
            'academic_year',
            'meeting_date', 'meeting_time', 'venue',
            'holiday_date', 'holiday_reason', 'resume_date',
            'stop_name', 'arrival_time',
            'marks_obtained', 'total_marks',
            'homework_details', 'submission_date',
            'attendance_status', 'due_date',
        ] as $placeholder) {
            $this->assertSame($placeholder, $mapping[$placeholder]);
        }
    }

    public function test_resolve_vars_resolves_new_event_and_attendance_context_keys(): void
    {
        $template = new QwaWhatsappTemplate([
            'placeholders' => ['student_name', 'attendance_status', 'due_date', 'academic_year', 'meeting_date'],
            'mapping' => [
                'student_name' => 'student_name',
                'attendance_status' => 'attendance_status',
                'due_date' => 'due_date',
                'academic_year' => 'academic_year',
                'meeting_date' => 'meeting_date',
            ],
        ]);

        $vars = $template->resolveVars(
            [
                'student_name' => 'Aarav',
                'attendance_status' => 'Absent',
                'due_date' => '30 Sep 2026',
                'academic_year' => '2026-2027',
            ],
            ['meeting_date' => '05 Oct 2026']
        );

        $this->assertSame('Aarav', $vars['student_name']);
        $this->assertSame('Absent', $vars['attendance_status']);
        $this->assertSame('30 Sep 2026', $vars['due_date']);
        $this->assertSame('2026-2027', $vars['academic_year']);
        $this->assertSame('05 Oct 2026', $vars['meeting_date']);
    }

    public function test_resolve_vars_prefers_context_then_static_values(): void
    {
        $template = new QwaWhatsappTemplate([
            'placeholders' => ['name', 'voucher', '1'],
            'mapping' => ['name' => 'student_name', 'voucher' => '', '1' => ''],
        ]);

        $vars = $template->resolveVars(
            ['name' => 'Tejas', 'phone' => '919021446889', 'class' => 'I', 'section' => 'A'],
            ['voucher' => 'VCH-001', '1' => '482913']
        );

        $this->assertSame('Tejas', $vars['name']);
        $this->assertSame('VCH-001', $vars['voucher']);
        $this->assertSame('482913', $vars['1']);
    }

    public function test_render_body_substitutes_all_tokens(): void
    {
        $template = new QwaWhatsappTemplate([
            'body' => 'Hi {{name}}, OTP {{1}}, outstanding {{balance}}.',
        ]);

        $rendered = $template->renderBody(['name' => 'Sam', '1' => '482913', 'balance' => '']);

        $this->assertSame('Hi Sam, OTP 482913, outstanding .', $rendered);
    }

    private function createIntentBaseTemplate(Organization $organization): QwaWhatsappTemplate
    {
        return QwaWhatsappTemplate::query()->create([
            'organization_id' => $organization->id,
            'session_id' => 'test-session',
            'qwa_template_id' => 'wa-fee-receipt',
            'name' => 'Fee Receipt Confirmation',
            'language' => 'en',
            'variant_key' => 'fee_receipt',
            'body' => 'Dear {{parent_name}}, payment of ₹{{amount}} received for {{student_name}}.',
            'placeholders' => ['parent_name', 'amount', 'student_name'],
            'mapping' => [
                'parent_name' => 'father_name',
                'amount' => 'total_paid',
                'student_name' => 'student_name',
            ],
            'action_toggles' => [],
        ]);
    }

    public function test_admin_can_add_a_regional_variant_to_an_intent_template(): void
    {
        Http::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $base = $this->createIntentBaseTemplate($organization);

        $response = $this->actingAs($user)
            ->post("/communication/send-qwa-whatsapp/templates/{$base->id}/add-variant", [
                'language' => 'mr',
            ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $variant = QwaWhatsappTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('variant_key', 'fee_receipt')
            ->where('language', 'mr')
            ->firstOrFail();

        $this->assertTrue($variant->is_custom);
        $this->assertNull($variant->qwa_template_id);
        $this->assertSame('custom', $variant->session_id);
        $this->assertSame($base->placeholders, collect($base->placeholders)->intersect($variant->placeholders)->values()->all());
        $this->assertContains('school_name', $variant->placeholders);
        foreach ($base->mapping as $placeholder => $value) {
            $this->assertSame($value, $variant->mapping[$placeholder] ?? null);
        }
        $this->assertSame('school_name', $variant->mapping['school_name']);
        $this->assertStringContainsString('पावती', $variant->body);
    }

    public function test_regional_variant_creation_is_idempotent(): void
    {
        [$organization, $user] = $this->createOrganizationAndAdmin();
        $base = $this->createIntentBaseTemplate($organization);

        $service = app(QwaRegionalTemplateService::class);

        $first = $service->ensureRegionalVariant($organization->id, 'fee_receipt', 'mr');
        $second = $service->ensureRegionalVariant($organization->id, 'fee_receipt', 'mr');

        $this->assertNotNull($first);
        $this->assertSame($first->id, $second->id);
        $this->assertSame($first->placeholders, $second->placeholders);
        $this->assertSame($base->placeholders, collect($base->placeholders)->intersect($first->placeholders)->values()->all());
        $this->assertContains('school_name', $first->placeholders);
        foreach ($base->mapping as $placeholder => $value) {
            $this->assertSame($value, $first->mapping[$placeholder] ?? null);
        }
        $this->assertSame(2, QwaWhatsappTemplate::query()->where('organization_id', $organization->id)->count());
    }

    public function test_variant_for_resolves_regional_variants_and_falls_back_to_english(): void
    {
        [$organization] = $this->createOrganizationAndAdmin();
        $base = $this->createIntentBaseTemplate($organization);

        $service = app(QwaRegionalTemplateService::class);
        $service->ensureRegionalVariant($organization->id, 'fee_receipt', 'mr');
        $service->ensureRegionalVariant($organization->id, 'fee_receipt', 'hi');
        $base->refresh();

        $this->assertSame('mr', $base->variantFor('mr')?->language);
        $this->assertSame('hi', $base->variantFor('hi')?->language);
        $this->assertSame($base->id, $base->variantFor('fr')?->id);

        $this->assertCount(3, $base->availableLanguages());
    }

    public function test_store_with_forced_regional_language_uses_the_variant_and_sends_text(): void
    {
        $this->fakeConnectedSession();
        Queue::fake();

        [$organization, $user] = $this->createOrganizationAndAdmin();
        $base = $this->createIntentBaseTemplate($organization);

        app(QwaRegionalTemplateService::class)->ensureRegionalVariant($organization->id, 'fee_receipt', 'mr');

        $response = $this->actingAs($user)->post('/communication/send-qwa-whatsapp', [
            'audienceType' => 'students',
            'selectedStaffRoles' => [],
            'selectedGroups' => [],
            'subject' => 'Fee Receipt',
            'content' => 'See body.',
            'messageType' => 'text',
            'templateId' => (string) $base->id,
            'templateLanguage' => 'mr',
            'templateVars' => [
                'parent_name' => 'Rajesh Mehta',
                'amount' => '1000',
                'student_name' => 'Aarav Mehta',
            ],
        ]);

        $response->assertRedirect('/communication/send-qwa-whatsapp');
        $response->assertSessionHas('success');

        $meta = Message::query()->firstOrFail()->attachments['qwa_whatsapp'];

        $this->assertSame('mr', $meta['template_language']);
        $this->assertSame('native', $meta['template_mode']);
        $this->assertSame('text', $meta['message_type']);

        $recipient = $meta['recipients'][0];
        $this->assertSame('mr', $recipient['template_language']);
        $this->assertSame('fallback', $recipient['template_mode']);
        $this->assertStringContainsString('पावती', (string) $recipient['rendered_text']);

        Queue::assertPushed(SendQwaWhatsappMessageJob::class, 1);
        Queue::assertPushed(
            SendQwaWhatsappMessageJob::class,
            fn (SendQwaWhatsappMessageJob $job) => $this->jobArgument($job, 'templateQwaId') === null
                && $this->jobArgument($job, 'templateMode') === 'fallback'
        );
    }

    private function createTemplateMessage(Organization $organization, User $user, string $mode, string $qwaTemplateId): Message
    {
        return Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => 'Template message',
            'message' => 'Body',
            'attachments' => [
                'channel' => 'qwa_whatsapp',
                'qwa_whatsapp' => [
                    'recipient_summary' => 'All Students',
                    'recipient_count' => 1,
                    'recipient_numbers' => ['919021446889'],
                    'status' => 'queued',
                    'session_id' => 'test-session',
                    'message_type' => 'text',
                    'media_path' => null,
                    'media_mime' => null,
                    'media_filename' => null,
                    'media_caption' => null,
                    'template_id' => '42',
                    'template_qwa_id' => $qwaTemplateId,
                    'template_name' => 'Template',
                    'template_mode' => $mode,
                    'queued_at' => now()->toDateTimeString(),
                    'successful_count' => 0,
                    'failed_count' => 0,
                    'pending_count' => 1,
                    'delay_min_seconds' => 3,
                    'delay_max_seconds' => 6,
                    'responses' => [],
                    'recipients' => [
                        [
                            'name' => 'Tejas',
                            'phone' => '919021446889',
                            'status' => 'pending',
                            'scheduled_at' => now()->toDateTimeString(),
                            'sent_at' => null,
                            'failed_reason' => null,
                            'template_vars' => $mode === 'native' ? ['name' => 'Tejas', 'balance' => '5000'] : ['1' => '482913'],
                            'rendered_text' => $mode === 'fallback' ? 'Your one-time password is 482913.' : null,
                        ],
                    ],
                ],
            ],
            'priority' => 'normal',
            'is_announcement' => false,
        ]);
    }

    private function jobArgument(SendQwaWhatsappMessageJob $job, string $property): mixed
    {
        $reflection = new ReflectionClass($job);
        $property = $reflection->getProperty($property);

        return $property->getValue($job);
    }
}