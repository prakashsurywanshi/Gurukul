<?php

namespace App\Services;

use App\Jobs\SendQwaWhatsappMessageJob;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\InventoryItem;
use App\Models\Message;
use App\Models\Organization;
use App\Models\QwaAutoAlertLog;
use App\Models\QwaAutoAlertRule;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Support\ContactPhoneResolver;
use App\Support\LanguageCatalog;
use App\Support\QwaAutoAlertTriggers;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class QwaAutoAlertService
{
    public function __construct(
        private readonly QwaService $qwaService,
        private readonly TemplateRenderService $templateRenderService,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function supportedTriggers(): array
    {
        return collect(QwaAutoAlertTriggers::supportedKeys())
            ->map(fn (string $key) => [
                'key' => $key,
                'label' => QwaAutoAlertTriggers::label($key),
                'description' => QwaAutoAlertTriggers::all()[$key]['description'] ?? '',
                'delivery' => QwaAutoAlertTriggers::delivery($key),
                'defaultRecipient' => QwaAutoAlertTriggers::defaultRecipient($key),
            ])
            ->values()
            ->all();
    }

    public function isGloballyEnabled(Organization $organization): bool
    {
        return (bool) ($organization->settings['communication_settings']['qwa']['auto_alerts_enabled'] ?? false);
    }

    public function setGloballyEnabled(Organization $organization, bool $enabled): void
    {
        $settings = $organization->settings ?? [];
        $settings['communication_settings'] = array_replace_recursive(
            (array) ($settings['communication_settings'] ?? []),
            ['qwa' => ['auto_alerts_enabled' => $enabled]],
        );

        $organization->update(['settings' => $settings]);
    }

    /**
     * Event-triggered dispatch, e.g. a fee payment was recorded. No-ops when
     * the gate is closed, no enabled rule exists for the trigger, or the
     * trigger has no recipient builder wired yet.
     *
     * @param  array<string, mixed>  $payload
     */
    public function dispatch(Organization $organization, string $trigger, array $payload = []): void
    {
        if (! $this->gatesOpen($organization)) {
            return;
        }

        $rules = $this->activeRules($organization, $trigger);

        if ($rules->isEmpty()) {
            return;
        }

        $builder = $this->builders()[$trigger] ?? null;

        if (! $builder) {
            return;
        }

        $this->process($organization, $trigger, $rules, $builder, $payload);
    }

    /**
     * Scheduled scan entry point (qwa:auto-alerts artisan command + scheduler).
     */
    public function runScheduled(?string $trigger = null, ?int $organizationId = null): void
    {
        $query = Organization::query();

        if ($organizationId) {
            $query->where('id', $organizationId);
        }

        foreach ($query->get() as $organization) {
            if (! $this->gatesOpen($organization)) {
                continue;
            }

            if (filled($trigger)) {
                $this->runTrigger($organization, $trigger);
            } else {
                foreach ($this->supportedTriggers() as $candidate) {
                    if (($candidate['delivery'] ?? '') === 'schedule') {
                        $this->runTrigger($organization, $candidate['key']);
                    }
                }
            }
        }
    }

    private function runTrigger(Organization $organization, string $trigger): void
    {
        $rules = $this->activeRules($organization, $trigger);

        if ($rules->isEmpty()) {
            return;
        }

        $builder = $this->builders()[$trigger] ?? null;

        if (! $builder) {
            return;
        }

        $this->process($organization, $trigger, $rules, $builder, []);
    }

    private function process(Organization $organization, string $trigger, Collection $rules, callable $builder, array $payload): void
    {
        foreach ($rules as $rule) {
            if (! $rule->template) {
                continue;
            }

            $recipients = $builder($organization, $payload, $rule);
            $this->sendForRule($organization, $rule, $trigger, $recipients);

            $rule->update(['last_fired_at' => now()]);
        }
    }

    /**
     * @return Collection<int, QwaAutoAlertRule>
     */
    private function activeRules(Organization $organization, string $trigger): Collection
    {
        return QwaAutoAlertRule::query()
            ->where('organization_id', $organization->id)
            ->where('trigger_event', $trigger)
            ->where('enabled', true)
            ->with('template')
            ->get()
            ->filter(fn (QwaAutoAlertRule $rule) => $rule->template !== null);
    }

    private function gatesOpen(Organization $organization): bool
    {
        if (! $this->isGloballyEnabled($organization)) {
            return false;
        }

        $connection = $this->qwaConnection($organization);

        return ($connection['configured'] ?? false) && ($connection['connected'] ?? false);
    }

    /**
     * QWA gateway configuration + a short-TTL cached "session is ready" check.
     *
     * @return array<string, mixed>
     */
    public function qwaConnection(Organization $organization): array
    {
        $qwa = array_replace_recursive(
            ['enabled' => false, 'baseUrl' => '', 'apiKey' => '', 'sessionId' => ''],
            $organization->settings['communication_settings']['qwa'] ?? []
        );

        if (filled($qwa['apiKey'] ?? '')) {
            try {
                $qwa['apiKey'] = Crypt::decryptString($qwa['apiKey']);
            } catch (Throwable) {
                // Keep the legacy plaintext value.
            }
        }

        $configured = filled($qwa['baseUrl'] ?? null)
            && filled($qwa['apiKey'] ?? null)
            && filled($qwa['sessionId'] ?? null);

        if (! $configured) {
            return ['configured' => false, 'connected' => false, 'sessionId' => null];
        }

        $connected = Cache::remember(
            sprintf('qwa_auto_alert_connected:%d', $organization->id),
            60,
            function () use ($qwa) {
                $check = $this->qwaService->sessionStatus($qwa['baseUrl'], $qwa['apiKey'], $qwa['sessionId']);

                return ($check['success'] ?? false) && (($check['body']['status'] ?? '') === 'ready');
            }
        );

        return ['configured' => true, 'connected' => (bool) $connected, 'sessionId' => $qwa['sessionId']];
    }

    /**
     * @param  array<int, array<string, mixed>>  $recipients
     */
    private function sendForRule(Organization $organization, QwaAutoAlertRule $rule, string $trigger, array $recipients): void
    {
        $template = $rule->template;

        $recipients = collect($recipients)
            ->map(fn (array $recipient) => [
                'name' => (string) ($recipient['name'] ?? ''),
                'phone' => ContactPhoneResolver::normalize((string) ($recipient['phone'] ?? '')),
                'context' => is_array($recipient['context'] ?? null) ? $recipient['context'] : [],
                'event_key' => (string) ($recipient['event_key'] ?? ''),
                'language' => (string) ($recipient['language'] ?? ''),
            ])
            ->filter(fn (array $recipient) => filled($recipient['phone']))
            ->filter(fn (array $recipient) => ! $this->alreadySent($rule, $recipient['event_key']))
            ->values();

        if ($recipients->isEmpty()) {
            return;
        }

        $mode = $template->canSendNatively() ? 'native' : 'fallback';
        $ruleLanguage = (string) ($rule->language ?? 'en');
        $regionalLanguage = $this->regionalLanguage($organization);
        $schoolName = (string) $organization->name;

        // A forced (non-auto) language applies the same regional variant to
        // every recipient; auto resolves each recipient's preferred language.
        $ruleTemplate = $ruleLanguage !== 'auto'
            ? ($template->variantFor($ruleLanguage) ?? $template)
            : $template;

        $delayMin = max(1, (int) config('services.whatsapp_bridge.send_delay_min_seconds', 3));
        $delayMax = max($delayMin, (int) config('services.whatsapp_bridge.send_delay_max_seconds', 6));
        $delayCursor = 0;

        $scheduled = $recipients
            ->map(function (array $recipient, int $index) use (&$delayCursor, $delayMin, $delayMax, $ruleTemplate, $template, $ruleLanguage, $regionalLanguage, $schoolName) {
                $delayCursor += $index === 0 ? 0 : random_int($delayMin, $delayMax);

                $context = array_replace([
                    'name' => $recipient['name'],
                    'phone' => $recipient['phone'],
                    'class' => (string) ($recipient['context']['class'] ?? ''),
                    'section' => (string) ($recipient['context']['section'] ?? ''),
                    'school_name' => $schoolName,
                ], $recipient['context']);

                $recipientTemplate = $ruleTemplate;
                $recipientLanguage = $ruleLanguage;

                if ($ruleLanguage === 'auto') {
                    $recipientLanguage = (string) ($recipient['language'] ?? '');

                    if (! LanguageCatalog::isValidCode($recipientLanguage)) {
                        $recipientLanguage = $regionalLanguage;
                    }

                    $recipientTemplate = $template->variantFor($recipientLanguage) ?? $template;
                }

                $recipientMode = $recipientTemplate->canSendNatively() ? 'native' : 'fallback';
                $vars = $recipientTemplate->resolveVars($context, []);
                $rendered = $recipientMode === 'fallback' ? $recipientTemplate->renderFullText($vars) : null;

                return [
                    'name' => $recipient['name'],
                    'phone' => $recipient['phone'],
                    'event_key' => $recipient['event_key'],
                    'delay_seconds' => $delayCursor,
                    'scheduled_at' => now()->addSeconds($delayCursor),
                    'template_id' => (string) $recipientTemplate->id,
                    'template_qwa_id' => $recipientTemplate->qwa_template_id,
                    'template_name' => $recipientTemplate->name,
                    'template_mode' => $recipientMode,
                    'template_language' => $recipientLanguage,
                    'template_vars' => $vars,
                    'rendered_text' => $rendered,
                ];
            });

        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => null,
            'subject' => sprintf('%s (%s)', $template->name, QwaAutoAlertTriggers::label($trigger)),
            'message' => trim((string) $scheduled->pluck('rendered_text')->filter()->first()),
            'attachments' => [
                'channel' => 'qwa_whatsapp',
                'qwa_whatsapp' => [
                    'recipient_summary' => sprintf('%d automatic alert recipient(s)', $scheduled->count()),
                    'recipient_count' => $scheduled->count(),
                    'recipient_numbers' => $scheduled->pluck('phone')->values()->all(),
                    'status' => 'queued',
                    'session_id' => $this->qwaConnection($organization)['sessionId'],
                    'message_type' => 'text',
                    'template_id' => (string) $template->id,
                    'template_qwa_id' => $template->qwa_template_id,
                    'template_name' => $template->name,
                    'template_mode' => $mode,
                    'template_language' => $ruleLanguage,
                    'is_automatic' => true,
                    'auto_alert_trigger' => $trigger,
                    'auto_alert_rule_id' => (string) $rule->id,
                    'queued_at' => now()->toDateTimeString(),
                    'successful_count' => 0,
                    'failed_count' => 0,
                    'pending_count' => $scheduled->count(),
                    'delay_min_seconds' => $delayMin,
                    'delay_max_seconds' => $delayMax,
                    'responses' => [],
                    'recipients' => $scheduled
                        ->map(fn (array $recipient) => [
                            'name' => $recipient['name'],
                            'phone' => $recipient['phone'],
                            'status' => 'pending',
                            'scheduled_at' => $recipient['scheduled_at']->toDateTimeString(),
                            'sent_at' => null,
                            'failed_reason' => null,
                            'template_id' => $recipient['template_id'],
                            'template_name' => $recipient['template_name'],
                            'template_language' => $recipient['template_language'],
                            'template_mode' => $recipient['template_mode'],
                            'template_vars' => $recipient['template_vars'],
                            'rendered_text' => $recipient['rendered_text'],
                        ])
                        ->all(),
                ],
            ],
            'priority' => 'normal',
            'is_announcement' => false,
        ]);

        foreach ($scheduled as $index => $recipient) {
            SendQwaWhatsappMessageJob::dispatch(
                $message->id,
                $organization->id,
                $index,
                $recipient['name'],
                $recipient['phone'],
                $recipient['rendered_text'] ?? $recipient['template_name'],
                'text',
                null,
                null,
                null,
                null,
                $recipient['template_qwa_id'],
                $recipient['template_mode'],
                $recipient['template_vars'],
            )->onQueue('whatsapp')->delay($recipient['scheduled_at']);
        }

        foreach ($scheduled as $recipient) {
            if (! filled($recipient['event_key'])) {
                continue;
            }

            try {
                QwaAutoAlertLog::query()->firstOrCreate(
                    ['rule_id' => $rule->id, 'event_key' => $recipient['event_key']],
                    [
                        'organization_id' => $organization->id,
                        'recipient_phone' => $recipient['phone'],
                        'sent_at' => $recipient['scheduled_at'],
                    ]
                );
            } catch (Throwable) {
                // The unique index protects against races; a duplicate simply wins elsewhere.
            }
        }
    }

    private function alreadySent(QwaAutoAlertRule $rule, string $eventKey): bool
    {
        if (! filled($eventKey)) {
            return false;
        }

        return QwaAutoAlertLog::query()
            ->where('rule_id', $rule->id)
            ->where('event_key', $eventKey)
            ->exists();
    }

    /**
     * The school's configured regional language (defaults to Marathi).
     */
    private function regionalLanguage(Organization $organization): string
    {
        return LanguageCatalog::normalize($organization->settings['language_settings'] ?? null)['regional_language'];
    }

    /**
     * Recipient builders keyed by trigger. Each receives the organization,
     * dispatch payload, and the active rule (so it can honour the rule's
     * recipient_type). Returns recipient rows:
     * ['name', 'phone', 'context' => [...], 'event_key' => string].
     *
     * @return array<string, callable>
     */
    private function builders(): array
    {
        return [
            'fee_payment_received' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->feePaymentRecipients($organization, $payload, $rule),
            'fee_due' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->feeDueRecipients($organization, $rule),
            'birthday' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->birthdayRecipients($organization, $rule),
            'complaint' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->roleAlertRecipients($organization, $payload, $rule),
            'admission_enquiry' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->roleAlertRecipients($organization, $payload, $rule),
            'lead' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->roleAlertRecipients($organization, $payload, $rule),
            'leave_request' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->roleAlertRecipients($organization, $payload, $rule),
            'gate_pass_issued' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->gatePassRecipients($organization, $payload, $rule),
            'admission_confirmed' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->admissionConfirmedRecipients($organization, $payload, $rule),
            'attendance_absent' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->attendanceAbsentRecipients($organization, $rule),
            'exam_results_published' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->examResultsPublishedRecipients($organization, $payload, $rule),
            'inventory_low_stock' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->inventoryLowStockRecipients($organization, $rule),
            'approval_request' => fn (Organization $organization, array $payload, QwaAutoAlertRule $rule) => $this->roleAlertRecipients($organization, $payload, $rule),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function feePaymentRecipients(Organization $organization, array $payload, QwaAutoAlertRule $rule): array
    {
        $payment = $payload['payment'] ?? null;
        $student = $payload['student'] ?? ($payment?->student ?? null);

        if (! $student instanceof Student) {
            return [];
        }

        $studentFee = $payload['student_fee'] ?? null;
        $remaining = $studentFee instanceof StudentFee
            ? max(0, (float) $studentFee->balance)
            : (float) ($payload['remaining_balance'] ?? 0);

        $reference = $payment?->receipt_number
            ?? $payload['receipt_no']
            ?? $studentFee?->id
            ?? 'manual';

        $context = $this->templateRenderService->schoolAndStudentContext($organization, $student);
        $context['receipt_no'] = (string) $reference;
        $context['cheque_no'] = (string) ($payload['cheque_no'] ?? ($payment?->cheque_number ?? ''));
        $context['transaction_id'] = (string) ($payload['transaction_id'] ?? ($payment?->transaction_id ?? ''));
        $context['transaction_bank_name'] = (string) ($payload['transaction_bank_name'] ?? ($payment?->bank_name ?? ''));
        $context['payment_mode'] = (string) ($payload['payment_mode'] ?? ($payment?->payment_method ?? ''));
        $context['payment_date'] = $payment?->payment_date
            ? $payment->payment_date->format('j M Y')
            : ($payload['payment_date'] ?? now()->format('j M Y'));
        $context['payment_date_short'] = $payment?->payment_date
            ? $payment->payment_date->format('d/m/y')
            : now()->format('d/m/y');
        $context['payment_datetime'] = $payment?->payment_date
            ? $payment->payment_date->format('j M Y, h:i A')
            : now()->format('j M Y, h:i A');
        $context['total_paid'] = number_format((float) ($payment?->amount ?? $payload['amount'] ?? 0), 2);
        $context['student_overall_balance_due'] = number_format($remaining, 2);
        $context['total_in_words'] = (string) ($payload['total_in_words'] ?? '');

        $eventKey = sprintf('student:%d:payment:%s', $student->id, $reference);

        return $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $context, $payload);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function feeDueRecipients(Organization $organization, QwaAutoAlertRule $rule): array
    {
        $today = Carbon::today();

        $fees = StudentFee::query()
            ->with(['student.schoolClass'])
            ->where('balance', '>', 0)
            ->where('due_date', '<=', $today)
            ->whereHas('student', fn ($query) => $query
                ->where('organization_id', $organization->id)
                ->where('status', 'active'))
            ->get();

        $recipients = [];

        foreach ($fees as $fee) {
            $student = $fee->student;

            if (! $student) {
                continue;
            }

            $context = $this->templateRenderService->schoolAndStudentContext($organization, $student);
            $context['student_overall_balance_due'] = number_format(max(0, (float) $fee->balance), 2);
            $context['total_paid'] = number_format(max(0, (float) ($fee->paid_amount ?? 0)), 2);
            $context['due_date'] = $fee->due_date ? $fee->due_date->format('j M Y') : '';

            $eventKey = sprintf('student:%d:fee:%d:due:%s:sent:%s', $student->id, $fee->id, (string) $fee->due_date?->format('Y-m-d'), $today->format('Y-m-d'));

            $recipients = array_merge($recipients, $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $context, []));
        }

        return $recipients;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function birthdayRecipients(Organization $organization, QwaAutoAlertRule $rule): array
    {
        $today = Carbon::today();

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereRaw('MONTH(date_of_birth) = ? AND DAY(date_of_birth) = ?', [$today->month, $today->day])
            ->with('schoolClass')
            ->get();

        $recipients = [];

        foreach ($students as $student) {
            if (! $student->date_of_birth) {
                continue;
            }

            $eventKey = sprintf('student:%d:birthday:%s', $student->id, $student->date_of_birth->format('Y-m-d'));

            $recipients = array_merge($recipients, $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $this->templateRenderService->schoolAndStudentContext($organization, $student), []));
        }

        return $recipients;
    }

    /**
     * Simplify a student-centric recipient set so the rule's recipient type
     * decides who actually gets the message.
     *
     * @return array<int, array<string, mixed>>
     */
    private function studentTargetedRecipients(Organization $organization, QwaAutoAlertRule $rule, Student $student, string $eventKey, array $context, array $payload): array
    {
        $recipientType = $rule->recipient_type;

        if ($recipientType === QwaAutoAlertTriggers::RECIPIENT_ROLES) {
            return collect($this->roleUserRecipients($organization, $rule, $context))
                ->map(fn (array $recipient) => ['event_key' => $eventKey] + $recipient)
                ->all();
        }

        if ($recipientType === QwaAutoAlertTriggers::RECIPIENT_STUDENTS) {
            $phone = ContactPhoneResolver::studentPrimary($student);

            if (! $phone) {
                return [];
            }

            $context['name'] = (string) $student->name ?: trim(($student->first_name ?? '').' '.($student->last_name ?? ''));
            $context['phone'] = $phone;

            return [[
                'name' => (string) $student->name ?: $context['name'],
                'phone' => $phone,
                'context' => $context,
                'event_key' => $eventKey,
                'language' => (string) $student->preferred_language,
            ]];
        }

        $parents = ContactPhoneResolver::studentParents($student);

        return $parents
            ->map(function (array $parent) use ($context, $eventKey, $student) {
                $recipientContext = array_replace($context, [
                    'name' => $parent['name'],
                    'phone' => $parent['phone'],
                    'guardian_phone' => $parent['phone'],
                ]);

                return [
                    'name' => $parent['name'],
                    'phone' => $parent['phone'],
                    'context' => $recipientContext,
                    'event_key' => $eventKey,
                    'language' => (string) $student->preferred_language,
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function roleAlertRecipients(Organization $organization, array $payload, QwaAutoAlertRule $rule): array
    {
        if ($rule->recipient_type !== QwaAutoAlertTriggers::RECIPIENT_ROLES) {
            return [];
        }

        $context = $this->templateRenderService->schoolAndStudentContext($organization, null);
        $context['alert_subject'] = (string) ($payload['subject'] ?? '');
        $context['alert_message'] = (string) ($payload['message'] ?? '');
        $context['name'] = (string) ($payload['name'] ?? '');

        $eventKey = (string) ($payload['event_key'] ?? '');

        return collect($this->roleUserRecipients($organization, $rule, $context))
            ->map(fn (array $recipient) => ['event_key' => $eventKey] + $recipient)
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function gatePassRecipients(Organization $organization, array $payload, QwaAutoAlertRule $rule): array
    {
        $student = $payload['student'] ?? null;
        $gatePass = $payload['gate_pass'] ?? null;

        if (! $student instanceof Student) {
            return [];
        }

        $context = $this->templateRenderService->schoolAndStudentContext($organization, $student);
        $context['gate_pass_type'] = (string) ($payload['pass_type'] ?? $gatePass?->pass_type ?? '');
        $context['gate_pass_reason'] = (string) ($payload['reason'] ?? $gatePass?->reason ?? '');
        $context['gate_pass_expected_return'] = (string) ($payload['expected_return_at'] ?? '');

        $eventKey = sprintf('student:%d:gate_pass:%s', $student->id, $gatePass?->id ?? $payload['gate_pass_id'] ?? 'manual');

        return $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $context, $payload);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function admissionConfirmedRecipients(Organization $organization, array $payload, QwaAutoAlertRule $rule): array
    {
        $student = $payload['student'] ?? null;

        if (! $student instanceof Student) {
            return [];
        }

        $context = $this->templateRenderService->schoolAndStudentContext($organization, $student);
        $context['admission_no'] = (string) ($student->admission_no ?? $payload['admission_no'] ?? '');

        $eventKey = sprintf('student:%d:admission:%s', $student->id, $student->admission_no ?? $payload['admission_id'] ?? 'new');

        return $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $context, $payload);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function attendanceAbsentRecipients(Organization $organization, QwaAutoAlertRule $rule): array
    {
        $today = Carbon::today();
        $todayKey = $today->format('Y-m-d');

        $records = Attendance::query()
            ->with(['student.schoolClass'])
            ->where('organization_id', $organization->id)
            ->whereDate('date', $today)
            ->where('status', 'absent')
            ->get();

        $recipients = [];

        foreach ($records as $record) {
            $student = $record->student;

            if (! $student) {
                continue;
            }

            $context = $this->templateRenderService->schoolAndStudentContext($organization, $student);
            $context['attendance_status'] = 'Absent';
            $context['attendance_date'] = $today->format('j M Y');
            $context['attendance_remarks'] = (string) $record->remarks;

            $eventKey = sprintf('student:%d:absent:%s:sent:%s', $student->id, $todayKey, $todayKey);

            $recipients = array_merge($recipients, $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $context, []));
        }

        return $recipients;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function examResultsPublishedRecipients(Organization $organization, array $payload, QwaAutoAlertRule $rule): array
    {
        $exam = $payload['exam'] ?? null;

        if (! $exam instanceof Exam) {
            return [];
        }

        $classIds = ExamSchedule::query()
            ->where('exam_id', $exam->id)
            ->whereNotNull('class_id')
            ->pluck('class_id')
            ->unique()
            ->values()
            ->all();

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereIn('class_id', $classIds)
            ->with('schoolClass')
            ->get();

        $recipients = [];

        foreach ($students as $student) {
            $context = $this->templateRenderService->schoolAndStudentContext($organization, $student);
            $context['exam_name'] = (string) $exam->name;

            $eventKey = sprintf('student:%d:exam:%d:published', $student->id, $exam->id);

            $recipients = array_merge($recipients, $this->studentTargetedRecipients($organization, $rule, $student, $eventKey, $context, []));
        }

        return $recipients;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function inventoryLowStockRecipients(Organization $organization, QwaAutoAlertRule $rule): array
    {
        if ($rule->recipient_type !== QwaAutoAlertTriggers::RECIPIENT_ROLES) {
            return [];
        }

        $items = InventoryItem::query()
            ->where('organization_id', $organization->id)
            ->whereColumn('available_stock', '<=', 'minimum_stock')
            ->where('minimum_stock', '>', 0)
            ->limit(50)
            ->get();

        if ($items->isEmpty()) {
            return [];
        }

        $summary = $items
            ->map(fn (InventoryItem $item) => sprintf('%s (%d left)', $item->name, (int) $item->available_stock))
            ->values()
            ->all();

        $context = $this->templateRenderService->schoolAndStudentContext($organization, null);
        $context['alert_subject'] = sprintf('Low stock alert: %d item(s)', $items->count());
        $context['alert_message'] = implode(', ', $summary);
        $context['name'] = '';

        $eventKey = sprintf('inventory:low_stock:sent:%s', now()->format('Y-m-d'));

        return collect($this->roleUserRecipients($organization, $rule, $context))
            ->map(fn (array $recipient) => ['event_key' => $eventKey] + $recipient)
            ->all();
    }

    /**
     * Staff recipients honouring the rule's chosen roles.
     *
     * @return array<int, array<string, mixed>>
     */
    private function roleUserRecipients(Organization $organization, QwaAutoAlertRule $rule, array $context): array
    {
        $roles = collect($rule->recipient_roles ?: [])
            ->filter(fn ($role) => filled((string) $role))
            ->values();

        if ($roles->isEmpty()) {
            $roles = collect(['admin', 'super_admin']);
        }

        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', $roles)
            ->where('status', 'active')
            ->get(['id', 'name', 'phone'])
            ->map(function (User $user) use ($context) {
                $phone = ContactPhoneResolver::userPhone($user);

                if (! $phone) {
                    return null;
                }

                return [
                    'name' => (string) $user->name,
                    'phone' => $phone,
                    'context' => array_replace($context, ['name' => (string) $user->name, 'phone' => $phone]),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }
}