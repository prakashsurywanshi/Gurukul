<?php

namespace App\Http\Controllers;

use App\Jobs\SendQwaWhatsappMessageJob;
use App\Jobs\SendSmsJob;
use App\Jobs\SendWhatsappMessageJob;
use App\Models\DownloadCenterMedia;
use App\Models\DownloadCenterShare;
use App\Models\EmailLog;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\SmsLog;
use App\Models\Student;
use App\Models\SuperAdminSetting;
use App\Models\User;
use App\Models\VoiceCallLog;
use App\Services\FirebaseCloudMessagingService;
use App\Services\QwaService;
use App\Services\SmartfloService;
use App\Services\SmsService;
use App\Services\StaffPermissionService;
use App\Services\WhatsappBridgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class CommunicationController extends Controller
{
    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly SmartfloService $smartfloService,
        private readonly FirebaseCloudMessagingService $firebaseCloudMessagingService,
        private readonly WhatsappBridgeService $whatsappBridgeService,
        private readonly QwaService $qwaService,
        private readonly SmsService $smsService,
    ) {}

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/Communication', [
            'user' => $user,
            'staffRecords' => $this->staffMessageRecords($organization),
            'studentRecords' => $this->studentMessageRecords($organization),
            'sentMessages' => $this->messageHistoryPayload($organization, $user),
        ]);
    }

    public function storeMessage(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section'])],
            'selectedStaffRoles' => ['nullable', 'array'],
            'selectedStaffRoles.*' => ['string'],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['nullable', 'string', 'max:10000'],
        ]);

        [$recipientUsers, $recipientSummary] = $this->resolveMessageRecipients($organization, $validated);

        if ($recipientUsers->isEmpty()) {
            return back()->withErrors([
                'message_recipients' => 'No valid recipients found for the selected audience.',
            ]);
        }

        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => $validated['subject'],
            'message' => $validated['content'],
            'attachments' => null,
            'priority' => 'normal',
            'is_announcement' => true,
        ]);

        $message->recipients()->createMany(
            $recipientUsers
                ->map(fn (User $recipient) => [
                    'recipient_id' => $recipient->id,
                    'is_read' => false,
                    'read_at' => null,
                    'is_starred' => false,
                    'is_archived' => false,
                ])
                ->all()
        );

        $sendNotification = (bool) ($validated['sendNotification'] ?? true);
        $recipientIds = $recipientUsers->pluck('id')->values()->all();

        $notificationResult = $this->dispatchPushNotificationForMessage($message, $recipientIds, $sendNotification, $recipientSummary);

        $successMessage = sprintf('Message sent to %s.', $recipientSummary);
        if ($notificationResult['attempted'] && $notificationResult['successCount'] > 0) {
            $successMessage .= sprintf(' Push notification delivered to %d of %d device(s).', $notificationResult['successCount'], $notificationResult['attemptedCount']);
        } elseif ($notificationResult['attempted'] && $notificationResult['failureCount'] > 0) {
            $successMessage .= sprintf(' Push notification attempted but %d device(s) failed.', $notificationResult['failureCount']);
        } elseif ($notificationResult['attempted']) {
            $successMessage .= ' No registered devices found for push notification.';
        }

        $smsLog = $this->dispatchSmsForRecipients(
            $organization,
            $recipientUsers,
            $validated['subject'],
            $validated['content'],
        );
        if ($smsLog !== null) {
            $successMessage .= sprintf(' SMS queued for %d recipient(s).', $smsLog->recipient_count);
        }

        return redirect()
            ->route('communication')
            ->with('success', $successMessage);
    }

    public function destroyMessage(Message $message): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $message->organization_id === (int) $organization->id, 404);
        abort_unless((int) $message->sender_id === (int) $user->id, 404);
        abort_if($this->isWhatsappMessage($message), 404);
        abort_if((bool) $message->is_announcement, 404);

        $message->recipients()->delete();
        $message->delete();

        return redirect()
            ->route('communication')
            ->with('success', 'Message history entry deleted successfully.');
    }

    public function noticeBoard()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/NoticeBoard', [
            'user' => $user,
            'notices' => $this->noticeBoardPayload($organization, $user),
            'classOptions' => $this->noticeBoardClassOptions($organization),
            'sectionOptions' => $this->noticeBoardSectionOptions($organization),
            'classSectionOptions' => $this->noticeBoardClassGroups($organization),
            'canManageNotices' => $this->canManageNotices($user),
        ]);
    }

    public function storeNotice(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($this->canManageNotices($user), 403);

        $validated = $this->validateNoticePayload($request);
        [$recipientUsers, $recipientSummary] = $this->resolveNoticeRecipients($organization, $validated);

        if ($recipientUsers->isEmpty()) {
            return back()->withErrors([
                'notice_recipients' => 'No valid notice recipients found for the selected audience.',
            ]);
        }

        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => $validated['title'],
            'message' => $validated['description'],
            'attachments' => [
                'notice_board' => [
                    'audience_type' => $validated['audienceType'],
                    'audience_label' => $recipientSummary,
                    'selected_groups' => $validated['selectedGroups'] ?? [],
                ],
            ],
            'priority' => $validated['pinned'] ? 'high' : 'normal',
            'is_announcement' => true,
        ]);

        $message->recipients()->createMany(
            $recipientUsers
                ->unique('id')
                ->map(fn (User $recipient) => [
                    'recipient_id' => $recipient->id,
                    'is_read' => false,
                    'read_at' => null,
                    'is_starred' => false,
                    'is_archived' => false,
                ])
                ->all()
        );

        $smsLog = $this->dispatchSmsForRecipients(
            $organization,
            $recipientUsers,
            $validated['title'],
            $validated['description'],
        );

        $successMessage = 'Notice published successfully.';
        if ($smsLog !== null) {
            $successMessage .= sprintf(' SMS queued for %d recipient(s).', $smsLog->recipient_count);
        }

        return redirect()
            ->route('communication.notice-board')
            ->with('success', $successMessage);
    }

    public function updateNotice(Request $request, Message $message): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($this->canManageNotices($user), 403);
        abort_unless($this->isOrganizationNotice($organization, $message), 404);

        $validated = $this->validateNoticePayload($request);
        [$recipientUsers, $recipientSummary] = $this->resolveNoticeRecipients($organization, $validated);

        if ($recipientUsers->isEmpty()) {
            return back()->withErrors([
                'notice_recipients' => 'No valid notice recipients found for the selected audience.',
            ]);
        }

        $message->update([
            'subject' => $validated['title'],
            'message' => $validated['description'],
            'attachments' => [
                'notice_board' => [
                    'audience_type' => $validated['audienceType'],
                    'audience_label' => $recipientSummary,
                    'selected_groups' => $validated['selectedGroups'] ?? [],
                ],
            ],
            'priority' => $validated['pinned'] ? 'high' : 'normal',
            'is_announcement' => true,
        ]);

        $message->recipients()->delete();
        $message->recipients()->createMany(
            $recipientUsers
                ->unique('id')
                ->map(fn (User $recipient) => [
                    'recipient_id' => $recipient->id,
                    'is_read' => false,
                    'read_at' => null,
                    'is_starred' => false,
                    'is_archived' => false,
                ])
                ->all()
        );

        return redirect()
            ->route('communication.notice-board')
            ->with('success', 'Notice updated successfully.');
    }

    public function destroyNotice(Message $message): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($this->canManageNotices($user), 403);
        abort_unless($this->isOrganizationNotice($organization, $message), 404);

        $message->recipients()->delete();
        $message->delete();

        return redirect()
            ->route('communication.notice-board')
            ->with('success', 'Notice deleted successfully.');
    }

    public function voiceCalls()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/VoiceCalls', [
            'user' => $user,
            'staffRecords' => $this->staffVoiceRecords($organization),
            'studentRecords' => $this->studentVoiceRecords($organization),
            'callHistory' => $this->voiceCallHistoryPayload($organization),
            'smartfloConfigured' => $this->hasSmartfloVoiceConfiguration($organization),
        ]);
    }

    public function storeVoiceCall(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section'])],
            'selectedStaffRoles' => ['nullable', 'array'],
            'selectedStaffRoles.*' => ['string'],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['nullable', 'string', 'max:10000'],
            'scheduledFor' => ['nullable', 'date'],
            'sendNotification' => ['nullable', 'boolean'],
            'audioFile' => ['nullable', 'file', 'mimes:mp3,wav,ogg,m4a,aac', 'max:51200'],
        ]);

        $smartfloConfigured = $this->hasSmartfloVoiceConfiguration($organization);
        $sendNotification = (bool) ($validated['sendNotification'] ?? true);

        if (! $smartfloConfigured && ! $sendNotification) {
            return back()->withErrors([
                'voice_delivery' => 'Smartflo is not configured and push notifications are disabled. Please configure Smartflo or enable push notifications.',
            ]);
        }

        [$recipientContacts, $recipientSummary] = $this->resolveVoiceRecipients($organization, $validated);

        if ($recipientContacts->isEmpty()) {
            return back()->withErrors([
                'voice_recipients' => 'No valid phone recipients found for the selected audience.',
            ]);
        }

        $audioFilePath = null;
        $audioFileName = null;
        $audioMimeType = null;
        $audioFileSize = 0;

        if ($request->hasFile('audioFile')) {
            $audio = $request->file('audioFile');
            $audioFilePath = $audio->store('voice-calls/audio/'.$organization->id, 'public');
            $audioFileName = $audio->getClientOriginalName();
            $audioMimeType = $audio->getClientMimeType();
            $audioFileSize = (int) $audio->getSize();
        }

        $scheduledFor = filled($validated['scheduledFor'] ?? null)
            ? Carbon::parse($validated['scheduledFor'])
            : null;

        if ($scheduledFor && $scheduledFor->isFuture()) {
            VoiceCallLog::query()->create([
                'organization_id' => $organization->id,
                'sender_id' => $user->id,
                'audience_type' => $validated['audienceType'],
                'recipient_summary' => $recipientSummary,
                'recipient_count' => $recipientContacts->count(),
                'recipient_phones' => $recipientContacts->pluck('phone')->values()->all(),
                'subject' => $validated['subject'],
                'content' => $validated['content'] ?? null,
                'audio_file_path' => $audioFilePath,
                'audio_file_name' => $audioFileName,
                'audio_mime_type' => $audioMimeType,
                'audio_file_size' => $audioFileSize,
                'status' => 'scheduled',
                'scheduled_for' => $scheduledFor,
                'provider_name' => $smartfloConfigured ? 'smartflo' : 'fcm',
            ]);

            return redirect()
                ->route('communication.voice-calls')
                ->with('success', sprintf('Voice call scheduled for %d recipient(s).', $recipientContacts->count()));
        }

        $voiceSettings = $this->smartfloVoiceSettings($organization);
        $responses = [];
        $successfulCalls = 0;
        $failedMessages = [];
        $status = 'notification_sent';

        if ($smartfloConfigured) {
            foreach ($recipientContacts as $index => $recipient) {
                $result = $this->smartfloService->initiateClickToCallSupport([
                    'customer_number' => $recipient['phone'],
                    'caller_id' => $voiceSettings['callerId'],
                    'api_key' => $voiceSettings['apiKey'],
                    'customer_ring_timeout' => $voiceSettings['ringTimeout'],
                    'call_timeout' => $voiceSettings['callTimeout'],
                    'custom_identifier' => sprintf(
                        'org-%d-user-%d-call-%s-%d',
                        $organization->id,
                        $user->id,
                        now()->format('YmdHis'),
                        $index + 1
                    ),
                ]);

                $responses[] = [
                    'phone' => $recipient['phone'],
                    'name' => $recipient['name'],
                    ...$result,
                ];

                if ($result['success']) {
                    $successfulCalls++;
                } else {
                    $failedMessages[] = sprintf('%s (%s): %s', $recipient['name'], $recipient['phone'], $result['message']);
                }
            }

            $status = match (true) {
                $successfulCalls === 0 => 'failed',
                $successfulCalls < $recipientContacts->count() => 'partial',
                default => 'completed',
            };
        }

        VoiceCallLog::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'audience_type' => $validated['audienceType'],
            'recipient_summary' => $recipientSummary,
            'recipient_count' => $recipientContacts->count(),
            'recipient_phones' => $recipientContacts->pluck('phone')->values()->all(),
            'subject' => $validated['subject'],
            'content' => $validated['content'] ?? null,
            'audio_file_path' => $audioFilePath,
            'audio_file_name' => $audioFileName,
            'audio_mime_type' => $audioMimeType,
            'audio_file_size' => $audioFileSize,
            'status' => $status,
            'scheduled_for' => $scheduledFor,
            'sent_at' => now(),
            'provider_name' => $smartfloConfigured ? 'smartflo' : 'fcm',
            'provider_reference' => collect($responses)->pluck('reference')->filter()->implode(', '),
            'provider_response' => $responses,
            'error_message' => empty($failedMessages) ? null : implode("\n", $failedMessages),
        ]);

        $this->dispatchVoiceCallPushNotification($organization, $user, $validated, $recipientContacts, $audioFilePath);

        if ($smartfloConfigured && $successfulCalls === 0) {
            return back()->withErrors([
                'voice_delivery' => 'Smartflo could not initiate the call. Please check the API key, caller ID, and recipient numbers.',
            ]);
        }

        if (! $smartfloConfigured) {
            return redirect()
                ->route('communication.voice-calls')
                ->with('success', sprintf('Push notification with audio sent to %d recipient(s).', $recipientContacts->count()));
        }

        return redirect()
            ->route('communication.voice-calls')
            ->with(
                'success',
                $status === 'partial'
                    ? sprintf('Voice calls started for %d of %d recipient(s).', $successfulCalls, $recipientContacts->count())
                    : sprintf('Voice calls started for %d recipient(s).', $successfulCalls)
            );
    }

    public function cancelVoiceCall(VoiceCallLog $voiceCallLog): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $voiceCallLog->organization_id === (int) $organization->id, 404);

        if ($voiceCallLog->status !== 'scheduled') {
            return redirect()
                ->route('communication.voice-calls')
                ->with('error', 'Only scheduled voice calls can be cancelled.');
        }

        $voiceCallLog->update([
            'status' => 'cancelled',
        ]);

        return redirect()
            ->route('communication.voice-calls')
            ->with('success', 'Scheduled voice call cancelled successfully.');
    }

    public function destroyVoiceCall(VoiceCallLog $voiceCallLog): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $voiceCallLog->organization_id === (int) $organization->id, 404);

        if ($voiceCallLog->audio_file_path && Storage::disk('public')->exists($voiceCallLog->audio_file_path)) {
            Storage::disk('public')->delete($voiceCallLog->audio_file_path);
        }

        $voiceCallLog->delete();

        return redirect()
            ->route('communication.voice-calls')
            ->with('success', 'Voice call history entry deleted successfully.');
    }

    public function sendEmails()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/SendEmails', [
            'user' => $user,
            'staffRecords' => $this->staffEmailRecords($organization),
            'studentRecords' => $this->studentEmailRecords($organization),
            'emailHistory' => $this->emailHistoryPayload($organization),
        ]);
    }

    public function storeEmail(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section', 'individual_staff', 'individual_students'])],
            'selectedStaffRoles' => ['nullable', 'array'],
            'selectedStaffRoles.*' => ['string'],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'selectedStaffUsers' => ['nullable', 'array'],
            'selectedStaffUsers.*' => ['integer'],
            'selectedStudents' => ['nullable', 'array'],
            'selectedStudents.*' => ['integer'],
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:10000'],
        ]);

        [$recipientContacts, $recipientSummary] = $this->resolveEmailRecipients($organization, $validated);

        if ($recipientContacts->isEmpty()) {
            return back()->withErrors([
                'email_recipients' => 'No valid email recipients found for the selected audience.',
            ]);
        }

        if (! $this->configureOutgoingMail()) {
            return back()->withErrors([
                'email_delivery' => 'SMTP is not configured or active. Please configure SMTP settings first.',
            ]);
        }

        try {
            foreach ($recipientContacts as $recipient) {
                Mail::raw(
                    $validated['content'],
                    function ($message) use ($recipient, $validated): void {
                        $message->to($recipient['email'], $recipient['name'] ?: null)
                            ->subject($validated['subject']);
                    }
                );
            }

            if (Schema::hasTable('email_logs')) {
                EmailLog::query()->create([
                    'organization_id' => $organization->id,
                    'sender_id' => $user->id,
                    'audience_type' => $validated['audienceType'],
                    'recipient_summary' => $recipientSummary,
                    'recipient_count' => $recipientContacts->count(),
                    'recipient_emails' => $recipientContacts->pluck('email')->values()->all(),
                    'subject' => $validated['subject'],
                    'content' => $validated['content'],
                    'status' => 'delivered',
                    'sent_at' => now(),
                    'error_message' => null,
                ]);
            }
        } catch (Throwable $exception) {
            report($exception);

            if (Schema::hasTable('email_logs')) {
                EmailLog::query()->create([
                    'organization_id' => $organization->id,
                    'sender_id' => $user->id,
                    'audience_type' => $validated['audienceType'],
                    'recipient_summary' => $recipientSummary,
                    'recipient_count' => $recipientContacts->count(),
                    'recipient_emails' => $recipientContacts->pluck('email')->values()->all(),
                    'subject' => $validated['subject'],
                    'content' => $validated['content'],
                    'status' => 'failed',
                    'sent_at' => now(),
                    'error_message' => $exception->getMessage(),
                ]);
            }

            return back()->withErrors([
                'email_delivery' => 'Email sending failed: '.$exception->getMessage(),
            ]);
        }

        return redirect()
            ->route('communication.send-emails')
            ->with('success', sprintf('Email sent successfully to %d recipient(s).', $recipientContacts->count()));
    }

    public function sendSms()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/SendSms', [
            'user' => $user,
            'staffRecords' => $this->staffVoiceRecords($organization),
            'studentRecords' => $this->studentVoiceRecords($organization),
            'smsHistory' => $this->smsHistoryPayload($organization),
            'smsConfigured' => $this->smsConfigurationStatus($organization),
        ]);
    }

    public function storeSms(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section'])],
            'selectedStaffRoles' => ['nullable', 'array'],
            'selectedStaffRoles.*' => ['string'],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'subject' => ['required', 'string', 'max:160'],
            'content' => ['nullable', 'string', 'max:160'],
        ]);

        $smsConfiguration = $this->smsConfigurationStatus($organization);

        if (! $smsConfiguration['configured']) {
            return back()->withErrors([
                'sms_delivery' => 'SMS is not configured. Enable SMS and provide a valid provider API key in Communication Settings first.',
            ]);
        }

        [$recipientContacts, $recipientSummary] = $this->resolveVoiceRecipients($organization, $validated);

        if ($recipientContacts->isEmpty()) {
            return back()->withErrors([
                'sms_recipients' => 'No valid phone recipients found for the selected audience.',
            ]);
        }

        $recipientPhones = $recipientContacts->pluck('phone')->filter()->unique()->values()->all();
        $content = trim((string) ($validated['content'] ?? ''));

        $smsLog = SmsLog::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'audience_type' => $validated['audienceType'],
            'recipient_summary' => $recipientSummary,
            'recipient_count' => count($recipientPhones),
            'recipient_phones' => $recipientPhones,
            'recipient_details' => collect($recipientPhones)
                ->mapWithKeys(fn (string $phone) => [
                    $phone => [
                        'phone' => $phone,
                        'status' => 'queued',
                        'queued_at' => now()->toDateTimeString(),
                        'sent_at' => null,
                        'failed_reason' => null,
                    ],
                ])
                ->all(),
            'subject' => $validated['subject'],
            'content' => $content !== '' ? $content : $validated['subject'],
            'status' => 'queued',
            'queued_at' => now(),
            'provider_name' => $smsConfiguration['provider'] ?? null,
        ]);

        foreach ($recipientPhones as $phone) {
            SendSmsJob::dispatch(
                $smsLog->id,
                $organization->id,
                $phone,
            )->onQueue('default');
        }

        return redirect()
            ->route('communication.send-sms')
            ->with('success', sprintf('SMS campaign queued for %d recipient(s). A queue worker will deliver messages in the background.', count($recipientPhones)));
    }

    public function destroySms(SmsLog $smsLog): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $smsLog->organization_id === (int) $organization->id, 404);

        $smsLog->delete();

        return redirect()
            ->route('communication.send-sms')
            ->with('success', 'SMS history entry deleted successfully.');
    }

    public function sendWhatsapp()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/SendWhatsapp', [
            'user' => $user,
            'staffRecords' => $this->staffVoiceRecords($organization),
            'studentRecords' => $this->studentVoiceRecords($organization),
            'whatsappHistory' => $this->whatsappHistoryPayload($organization, $user),
            'bridgeStatus' => $this->bridgeStatusPayload($organization),
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    public function storeWhatsapp(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section'])],
            'selectedStaffRoles' => ['nullable', 'array'],
            'selectedStaffRoles.*' => ['string'],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:10000'],
        ]);

        $result = $this->launchWhatsappCampaign($organization, $user, $validated);

        if (! $result['success']) {
            return back()->withErrors($result['errors']);
        }

        return redirect()
            ->route('communication.send-whatsapp')
            ->with('success', $result['message']);
    }

    public function launchWhatsappCampaign(Organization $organization, User $user, array $validated): array
    {
        [$recipientContacts, $recipientSummary] = $this->resolveVoiceRecipients($organization, $validated);

        if ($recipientContacts->isEmpty()) {
            $message = 'No valid WhatsApp recipients found for the selected audience.';

            return ['success' => false, 'message' => $message, 'errors' => ['whatsapp_recipients' => $message]];
        }

        $bridgeStatus = $this->bridgeStatusPayload($organization);

        if (! ($bridgeStatus['configured'] ?? false)) {
            $message = 'WhatsApp bridge URL is not configured.';

            return ['success' => false, 'message' => $message, 'errors' => ['whatsapp_delivery' => $message]];
        }

        if (! ($bridgeStatus['connected'] ?? false)) {
            $message = 'WhatsApp is not connected. Scan the QR code from the setup panel first.';

            return ['success' => false, 'message' => $message, 'errors' => ['whatsapp_delivery' => $message]];
        }

        $session = $this->currentWhatsappBridgeSession($organization);
        $accountNumber = $this->extractWhatsappAccountNumber($bridgeStatus['account'] ?? null);
        $recipientCount = $recipientContacts->count();
        $successMessage = sprintf('WhatsApp campaign queued for %d recipient(s). A queue worker will send messages gradually in the background.', $recipientCount);
        $delayMin = max(1, (int) config('services.whatsapp_bridge.send_delay_min_seconds', 3));
        $delayMax = max($delayMin, (int) config('services.whatsapp_bridge.send_delay_max_seconds', 6));
        $delayCursor = 0;
        $scheduledRecipients = $recipientContacts
            ->values()
            ->map(function (array $recipient, int $index) use (&$delayCursor, $delayMin, $delayMax) {
                $delayCursor += $index === 0 ? 0 : random_int($delayMin, $delayMax);

                return [
                    'name' => $recipient['name'],
                    'phone' => $recipient['phone'],
                    'delay_seconds' => $delayCursor,
                    'scheduled_at' => now()->addSeconds($delayCursor),
                ];
            });

        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => $validated['subject'],
            'message' => $validated['content'],
            'attachments' => [
                'channel' => 'whatsapp',
                'whatsapp' => [
                    'recipient_summary' => $recipientSummary,
                    'recipient_count' => $recipientCount,
                    'recipient_numbers' => $recipientContacts->pluck('phone')->values()->all(),
                    'status' => 'queued',
                    'bridge_session' => $session,
                    'account_number' => $accountNumber,
                    'queued_at' => now()->toDateTimeString(),
                    'successful_count' => 0,
                    'failed_count' => 0,
                    'pending_count' => $recipientCount,
                    'delay_min_seconds' => $delayMin,
                    'delay_max_seconds' => $delayMax,
                    'responses' => [],
                    'recipients' => $scheduledRecipients
                        ->map(fn (array $recipient) => [
                            'name' => $recipient['name'],
                            'phone' => $recipient['phone'],
                            'status' => 'pending',
                            'scheduled_at' => $recipient['scheduled_at']->toDateTimeString(),
                            'sent_at' => null,
                            'failed_reason' => null,
                        ])
                        ->all(),
                ],
            ],
            'priority' => 'normal',
            'is_announcement' => false,
        ]);

        foreach ($scheduledRecipients as $index => $recipient) {
            SendWhatsappMessageJob::dispatch(
                $message->id,
                $organization->id,
                $index,
                $recipient['name'],
                $recipient['phone'],
                trim($validated['subject'])."\n\n".trim($validated['content']),
                $session,
            )->onQueue('whatsapp')->delay($recipient['scheduled_at']);
        }

        return ['success' => true, 'message' => $successMessage, 'errors' => []];
    }

    public function whatsappBridgeStatus(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return response()->json([
            ...$this->bridgeStatusPayload($organization),
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    public function disconnectWhatsapp(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $session = $this->currentWhatsappBridgeSession($organization);
        $result = $this->whatsappBridgeService->logout($session);

        $this->persistWhatsappBridgeSession($organization, null);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'status' => 'disconnected',
        ], $result['success'] ? 200 : 409);
    }

    public function destroyWhatsapp(Message $message): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $message->organization_id === (int) $organization->id, 404);
        abort_unless((int) $message->sender_id === (int) $user->id, 404);
        abort_unless($this->isWhatsappMessage($message), 404);

        $message->recipients()->delete();
        $message->delete();

        return redirect()
            ->route('communication.send-whatsapp')
            ->with('success', 'WhatsApp history entry deleted successfully.');
    }

    public function sendQwaWhatsapp()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/SendQwaWhatsapp', [
            'user' => $user,
            'staffRecords' => $this->staffVoiceRecords($organization),
            'studentRecords' => $this->studentVoiceRecords($organization),
            'qwaHistory' => $this->qwaHistoryPayload($organization, $user),
            'qwaStatus' => $this->qwaDeliveryStatusPayload($organization),
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    public function storeQwaWhatsapp(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section'])],
            'selectedStaffRoles' => ['nullable', 'array'],
            'selectedStaffRoles.*' => ['string'],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['nullable', 'string', 'max:10000'],
            'messageType' => ['required', Rule::in(['text', 'photo', 'audio', 'document'])],
            'mediaFile' => ['nullable', 'file', 'max:15360'],
            'mediaCaption' => ['nullable', 'string', 'max:1024'],
        ]);

        $messageType = $validated['messageType'] ?? 'text';
        $mediaCaption = trim((string) ($validated['mediaCaption'] ?? ''));

        $mediaPath = null;
        $mediaMime = null;
        $mediaFilename = null;

        if ($messageType !== 'text') {
            $file = $request->file('mediaFile');

            if (! $file) {
                return back()->withErrors([
                    'media_file' => 'Please select a media file to send.',
                ]);
            }

            $allowedExtensions = match ($messageType) {
                'photo' => ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp'],
                'audio' => ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'amr', 'opus'],
                'document' => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'],
                default => [],
            };

            $extension = strtolower((string) $file->getClientOriginalExtension());

            if (! in_array($extension, $allowedExtensions, true)) {
                return back()->withErrors([
                    'media_file' => 'The selected file type is not allowed for '.$messageType.' messages.',
                ]);
            }

            $mediaPath = $file->store('qwa_whatsapp', 'public');
            $mediaMime = $file->getMimeType();
            $mediaFilename = $file->getClientOriginalName();
        }

        [$recipientContacts, $recipientSummary] = $this->resolveVoiceRecipients($organization, $validated);

        if ($recipientContacts->isEmpty()) {
            return back()->withErrors([
                'qwa_recipients' => 'No valid QWA WhatsApp recipients found for the selected audience.',
            ]);
        }

        $deliveryStatus = $this->qwaDeliveryStatusPayload($organization);

        if (! ($deliveryStatus['configured'] ?? false)) {
            return back()->withErrors([
                'qwa_delivery' => 'QWA is not configured. Set up the QWA gateway in Communication Settings first.',
            ]);
        }

        if (! ($deliveryStatus['connected'] ?? false)) {
            return back()->withErrors([
                'qwa_delivery' => 'QWA is not connected. Start the QWA session and scan the QR code before sending.',
            ]);
        }

        $sessionId = $deliveryStatus['sessionId'];
        $recipientCount = $recipientContacts->count();
        $delayMin = max(1, (int) config('services.whatsapp_bridge.send_delay_min_seconds', 3));
        $delayMax = max($delayMin, (int) config('services.whatsapp_bridge.send_delay_max_seconds', 6));
        $delayCursor = 0;
        $scheduledRecipients = $recipientContacts
            ->values()
            ->map(function (array $recipient, int $index) use (&$delayCursor, $delayMin, $delayMax) {
                $delayCursor += $index === 0 ? 0 : random_int($delayMin, $delayMax);

                return [
                    'name' => $recipient['name'],
                    'phone' => $recipient['phone'],
                    'delay_seconds' => $delayCursor,
                    'scheduled_at' => now()->addSeconds($delayCursor),
                ];
            });

        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => $validated['subject'],
            'message' => trim((string) ($validated['content'] ?? '')),
            'attachments' => [
                'channel' => 'qwa_whatsapp',
                'qwa_whatsapp' => [
                    'recipient_summary' => $recipientSummary,
                    'recipient_count' => $recipientCount,
                    'recipient_numbers' => $recipientContacts->pluck('phone')->values()->all(),
                    'status' => 'queued',
                    'session_id' => $sessionId,
                    'message_type' => $messageType,
                    'media_path' => $mediaPath,
                    'media_mime' => $mediaMime,
                    'media_filename' => $mediaFilename,
                    'media_caption' => $mediaCaption ?: null,
                    'queued_at' => now()->toDateTimeString(),
                    'successful_count' => 0,
                    'failed_count' => 0,
                    'pending_count' => $recipientCount,
                    'delay_min_seconds' => $delayMin,
                    'delay_max_seconds' => $delayMax,
                    'responses' => [],
                    'recipients' => $scheduledRecipients
                        ->map(fn (array $recipient) => [
                            'name' => $recipient['name'],
                            'phone' => $recipient['phone'],
                            'status' => 'pending',
                            'scheduled_at' => $recipient['scheduled_at']->toDateTimeString(),
                            'sent_at' => null,
                            'failed_reason' => null,
                        ])
                        ->all(),
                ],
            ],
            'priority' => 'normal',
            'is_announcement' => false,
        ]);

        $mediaCaptionForJob = $mediaCaption !== '' ? $mediaCaption : (trim((string) ($validated['content'] ?? '')) ?: $validated['subject']);

        foreach ($scheduledRecipients as $index => $recipient) {
            SendQwaWhatsappMessageJob::dispatch(
                $message->id,
                $organization->id,
                $index,
                $recipient['name'],
                $recipient['phone'],
                trim($validated['subject'])."\n\n".trim((string) ($validated['content'] ?? '')),
                $messageType,
                $mediaPath,
                $mediaMime,
                $mediaFilename,
                $mediaCaptionForJob,
            )->onQueue('whatsapp')->delay($recipient['scheduled_at']);
        }

        return redirect()
            ->route('communication.send-qwa-whatsapp')
            ->with('success', sprintf('QWA WhatsApp campaign queued for %d recipient(s). A queue worker will send messages gradually in the background.', $recipientCount));
    }

    public function qwaWhatsappStatus(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return response()->json([
            ...$this->qwaDeliveryStatusPayload($organization),
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    public function qwaWhatsappConnect(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $settings = $this->qwaSettings($organization);
        $configured = filled($settings['baseUrl'] ?? null)
            && filled($settings['apiKey'] ?? null)
            && filled($settings['sessionId'] ?? null);

        if (! $configured) {
            return response()->json([
                'configured' => false,
                'connected' => false,
                'status' => 'not_configured',
                'statusLabel' => 'Not Configured',
                'sessionId' => null,
                'phone' => null,
                'pushName' => null,
                'qrCode' => null,
                'started' => false,
                'message' => 'QWA is not configured. Set it up in Communication Settings first.',
            ]);
        }

        $statusPayload = $this->qwaDeliveryStatusPayload($organization);

        if ($statusPayload['connected']) {
            return response()->json([
                ...$statusPayload,
                'qrCode' => null,
                'started' => false,
                'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
            ]);
        }

        $startResult = $this->qwaService->startSession($settings['baseUrl'], $settings['apiKey'], $settings['sessionId']);

        if (! $startResult['success']) {
            $message = match ($startResult['statusCode']) {
                503 => $startResult['message'],
                401 => 'API key is invalid or not authorized for this session.',
                404 => 'QWA session not found. Create the session first, then check the session ID/name in Communication Settings.',
                default => 'Unable to start the QWA session.',
            };

            return response()->json([
                'configured' => true,
                'connected' => false,
                'status' => 'error',
                'statusLabel' => 'Failed',
                'sessionId' => $settings['sessionId'],
                'phone' => null,
                'pushName' => null,
                'qrCode' => null,
                'started' => false,
                'message' => $message,
            ]);
        }

        $body = is_array($startResult['body']) ? $startResult['body'] : [];
        $status = (string) ($body['status'] ?? 'initializing');
        $connected = $status === 'ready';
        $qrCode = null;

        if (! $connected) {
            $qrResult = $this->qwaService->sessionQr($settings['baseUrl'], $settings['apiKey'], $settings['sessionId']);

            if ($qrResult['success']) {
                $qrBody = is_array($qrResult['body']) ? $qrResult['body'] : [];
                $qrCode = $qrBody['qrCode'] ?? null;
                $status = (string) ($qrBody['status'] ?? $status);
            }
        }

        return response()->json([
            'configured' => true,
            'connected' => $connected,
            'status' => $status,
            'statusLabel' => match ($status) {
                'ready' => 'Connected',
                'initializing', 'qr_ready', 'authenticating' => 'Connecting',
                'failed' => 'Failed',
                default => 'Disconnected',
            },
            'sessionId' => $settings['sessionId'],
            'phone' => $body['phone'] ?? null,
            'pushName' => $body['pushName'] ?? null,
            'qrCode' => $qrCode,
            'started' => true,
            'message' => $connected
                ? 'QWA session started and is connected.'
                : 'QWA session started. Scan the QR code with WhatsApp to connect.',
        ]);
    }

    public function startQueueWorker(): JsonResponse
    {
        $this->authorizeQueueWorkerControl();

        SuperAdminSetting::singleton()->forceFill(['queue_worker_status' => 'running'])->save();

        $this->spawnQueueWorker();

        return response()->json([
            'success' => true,
            'message' => 'Queue worker started. Pending jobs will be processed in the background.',
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    public function pauseQueueWorker(): JsonResponse
    {
        $this->authorizeQueueWorkerControl();

        SuperAdminSetting::singleton()->forceFill(['queue_worker_status' => 'paused'])->save();

        $this->stopQueueWorkerProcesses();

        return response()->json([
            'success' => true,
            'message' => 'Queue worker paused. Queued jobs will wait until the worker is started again.',
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    public function stopQueueWorker(): JsonResponse
    {
        $this->authorizeQueueWorkerControl();

        SuperAdminSetting::singleton()->forceFill(['queue_worker_status' => 'stopped'])->save();

        $this->stopQueueWorkerProcesses();

        return response()->json([
            'success' => true,
            'message' => 'Queue worker stopped.',
            'queueWorkerStatus' => $this->queueWorkerStatusPayload(),
        ]);
    }

    private function authorizeQueueWorkerControl(): void
    {
        $user = Auth::user();

        abort_unless($user && in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function spawnQueueWorker(): void
    {
        if (! $this->isFunctionAvailable('exec') || PHP_OS_FAMILY === 'Windows') {
            return;
        }

        $command = sprintf(
            '%s %s queue:work database --queue=imports,whatsapp,default --stop-when-empty --tries=3 --timeout=120 >> %s 2>&1 &',
            escapeshellarg(PHP_BINARY),
            escapeshellarg(base_path('artisan')),
            escapeshellarg(storage_path('logs/queue-cron.log'))
        );

        exec($command);
    }

    private function stopQueueWorkerProcesses(): void
    {
        foreach ($this->queueWorkerProcessPids() as $pid) {
            exec('kill '.((int) $pid));
        }
    }

    private function queueWorkerProcessPids(): array
    {
        if (! $this->isFunctionAvailable('exec') || PHP_OS_FAMILY === 'Windows') {
            return [];
        }

        $output = [];
        $exitCode = 1;
        exec('ps -eo pid=,command=', $output, $exitCode);

        if ($exitCode !== 0) {
            return [];
        }

        return collect($output)
            ->map(function (string $line) {
                if (preg_match('/^\s*(\d+)\s+(.+)$/', $line, $matches) !== 1) {
                    return null;
                }

                return ['pid' => (int) $matches[1], 'command' => $matches[2]];
            })
            ->filter(fn (?array $entry) => $entry !== null)
            ->filter(fn (array $entry) => str_contains($entry['command'], 'artisan')
                && (str_contains($entry['command'], 'queue:work') || str_contains($entry['command'], 'queue:listen')))
            ->pluck('pid')
            ->values()
            ->all();
    }

    public function destroyQwaWhatsapp(Message $message): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $message->organization_id === (int) $organization->id, 404);
        abort_unless((int) $message->sender_id === (int) $user->id, 404);
        abort_unless(($message->attachments['channel'] ?? null) === 'qwa_whatsapp', 404);

        $message->recipients()->delete();
        $message->delete();

        return redirect()
            ->route('communication.send-qwa-whatsapp')
            ->with('success', 'QWA WhatsApp history entry deleted successfully.');
    }

    public function resendQwaWhatsapp(Message $message): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $message->organization_id === (int) $organization->id, 404);
        abort_unless((int) $message->sender_id === (int) $user->id, 404);
        abort_unless(($message->attachments['channel'] ?? null) === 'qwa_whatsapp', 404);

        $meta = is_array($message->attachments['qwa_whatsapp'] ?? null) ? $message->attachments['qwa_whatsapp'] : [];

        $recipients = collect($meta['recipients'] ?? [])
            ->filter(fn (array $recipient) => filled($recipient['phone'] ?? null))
            ->map(fn (array $recipient) => [
                'name' => $recipient['name'] ?? $recipient['phone'],
                'phone' => $recipient['phone'],
            ])
            ->values()
            ->all();

        if (empty($recipients)) {
            $recipients = collect($meta['recipient_numbers'] ?? [])
                ->filter()
                ->map(fn (string $phone) => ['name' => $phone, 'phone' => $phone])
                ->values()
                ->all();
        }

        if (empty($recipients)) {
            return redirect()
                ->route('communication.send-qwa-whatsapp')
                ->withErrors([
                    'qwa_recipients' => 'No recipients recorded for this QWA WhatsApp message.',
                ]);
        }

        $deliveryStatus = $this->qwaDeliveryStatusPayload($organization);

        if (! ($deliveryStatus['configured'] ?? false)) {
            return redirect()
                ->route('communication.send-qwa-whatsapp')
                ->withErrors([
                    'qwa_delivery' => 'QWA is not configured. Set up the QWA gateway in Communication Settings first.',
                ]);
        }

        if (! ($deliveryStatus['connected'] ?? false)) {
            return redirect()
                ->route('communication.send-qwa-whatsapp')
                ->withErrors([
                    'qwa_delivery' => 'QWA is not connected. Start the QWA session and scan the QR code before resending.',
                ]);
        }

        $messageType = $meta['message_type'] ?? 'text';
        $recipientCount = count($recipients);
        $delayMin = max(1, (int) config('services.whatsapp_bridge.send_delay_min_seconds', 3));
        $delayMax = max($delayMin, (int) config('services.whatsapp_bridge.send_delay_max_seconds', 6));
        $delayCursor = 0;
        $scheduledRecipients = collect($recipients)
            ->map(function (array $recipient, int $index) use (&$delayCursor, $delayMin, $delayMax) {
                $delayCursor += $index === 0 ? 0 : random_int($delayMin, $delayMax);

                return [
                    'name' => $recipient['name'],
                    'phone' => $recipient['phone'],
                    'delay_seconds' => $delayCursor,
                    'scheduled_at' => now()->addSeconds($delayCursor),
                ];
            });

        $now = now()->toDateTimeString();
        $attachments = $message->attachments;
        $attachments['channel'] = 'qwa_whatsapp';
        $attachments['qwa_whatsapp'] = array_replace($meta, [
            'recipient_count' => $recipientCount,
            'status' => 'queued',
            'session_id' => $deliveryStatus['sessionId'],
            'queued_at' => $now,
            'successful_count' => 0,
            'failed_count' => 0,
            'pending_count' => $recipientCount,
            'delay_min_seconds' => $delayMin,
            'delay_max_seconds' => $delayMax,
            'responses' => [],
            'recipients' => $scheduledRecipients
                ->map(fn (array $recipient) => [
                    'name' => $recipient['name'],
                    'phone' => $recipient['phone'],
                    'status' => 'pending',
                    'scheduled_at' => $recipient['scheduled_at']->toDateTimeString(),
                    'sent_at' => null,
                    'failed_reason' => null,
                ])
                ->all(),
        ]);

        $message->forceFill(['attachments' => $attachments])->save();

        $messageText = trim((string) $message->subject)."\n\n".trim((string) $message->message);
        $mediaCaptionForJob = filled($meta['media_caption'] ?? null)
            ? $meta['media_caption']
            : (trim((string) $message->message) ?: $message->subject);

        foreach ($scheduledRecipients as $index => $recipient) {
            SendQwaWhatsappMessageJob::dispatch(
                $message->id,
                $organization->id,
                $index,
                $recipient['name'],
                $recipient['phone'],
                $messageText,
                $messageType,
                $meta['media_path'] ?? null,
                $meta['media_mime'] ?? null,
                $meta['media_filename'] ?? null,
                $mediaCaptionForJob,
            )->onQueue('whatsapp')->delay($recipient['scheduled_at']);
        }

        return redirect()
            ->route('communication.send-qwa-whatsapp')
            ->with('success', sprintf('QWA WhatsApp campaign re-queued for %d recipient(s). A queue worker will send messages gradually in the background.', $recipientCount));
    }

    public function destroyEmail(EmailLog $emailLog): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $emailLog->organization_id === (int) $organization->id, 404);

        $emailLog->delete();

        return redirect()
            ->route('communication.send-emails')
            ->with('success', 'Email history entry deleted successfully.');
    }

    public function downloadCenter()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/DownloadCenter', [
            'user' => $user,
            'mediaLibrary' => $this->downloadCenterMediaPayload($organization),
            'contentItems' => $this->downloadCenterSharesPayload($organization, $user),
            'shareGroups' => $this->downloadCenterShareGroups($organization),
            'uploadLimits' => $this->downloadCenterUploadLimits(),
        ]);
    }

    public function storeDownloadCenterMedia(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($this->canManageDownloadCenter($user), 403);

        $uploadLimits = $this->downloadCenterUploadLimits();
        $contentLength = (int) ($request->server('CONTENT_LENGTH') ?? 0);

        if (($request->input('uploadMode') ?? 'file') === 'file' && ! $request->hasFile('file') && $contentLength > $uploadLimits['maxBytes']) {
            return back()
                ->withErrors([
                    'media_file' => 'The selected file exceeds the server upload limit of '.$uploadLimits['maxLabel'].'.',
                ])
                ->withInput();
        }

        $validated = $request->validate([
            'uploadMode' => ['required', Rule::in(['file', 'youtube'])],
            'title' => ['required', 'string', 'max:255'],
            'mediaType' => ['required', Rule::in(['document', 'video', 'tutorial'])],
            'category' => ['required', 'string', 'max:255'],
            'format' => ['nullable', 'string', 'max:20'],
            'description' => ['required', 'string', 'max:5000'],
            'duration' => ['nullable', 'string', 'max:50'],
            'youtubeUrl' => ['nullable', 'url', 'max:1000'],
            'file' => ['nullable', 'file', 'max:20480'],
        ], [
            'file.max' => 'The uploaded media file must not be greater than 20 MB.',
        ]);

        if ($validated['uploadMode'] === 'youtube') {
            DownloadCenterMedia::query()->create([
                'organization_id' => $organization->id,
                'uploaded_by_user_id' => $user?->id,
                'title' => $validated['title'],
                'media_type' => $validated['mediaType'],
                'source_kind' => 'youtube',
                'category' => $validated['category'],
                'format' => 'YOUTUBE',
                'file_name' => null,
                'file_path' => null,
                'mime_type' => null,
                'file_size' => 0,
                'youtube_url' => $validated['youtubeUrl'] ?? null,
                'description' => $validated['description'],
                'duration' => $validated['duration'] ?? null,
                'is_active' => true,
            ]);

            return redirect()
                ->route('communication.download-center')
                ->with('success', 'YouTube media saved successfully.');
        }

        $uploadedFile = $request->file('file');

        if (! $uploadedFile) {
            return back()
                ->withErrors([
                    'media_file' => 'Please choose a document or video file to upload.',
                ])
                ->withInput();
        }

        $path = $uploadedFile->store('download-center/media/'.$organization->id, 'local');

        DownloadCenterMedia::query()->create([
            'organization_id' => $organization->id,
            'uploaded_by_user_id' => $user?->id,
            'title' => $validated['title'],
            'media_type' => $validated['mediaType'],
            'source_kind' => 'file',
            'category' => $validated['category'],
            'format' => strtoupper($validated['format'] ?: ($uploadedFile->getClientOriginalExtension() ?: 'FILE')),
            'file_name' => $uploadedFile->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $uploadedFile->getClientMimeType(),
            'file_size' => (int) $uploadedFile->getSize(),
            'youtube_url' => null,
            'description' => $validated['description'],
            'duration' => $validated['mediaType'] === 'document' ? null : ($validated['duration'] ?? null),
            'is_active' => true,
        ]);

        return redirect()
            ->route('communication.download-center')
            ->with('success', 'Media uploaded successfully.');
    }

    public function storeDownloadCenterShare(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless($this->canManageDownloadCenter($user), 403);

        $validated = $request->validate([
            'mediaId' => ['required', 'integer'],
            'audience' => ['required', Rule::in(['students', 'staff', 'both'])],
            'shareGroup' => ['required', 'string', 'max:100'],
        ]);

        $media = DownloadCenterMedia::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->find($validated['mediaId']);

        if (! $media) {
            return back()->withErrors([
                'share_media_id' => 'Please select a valid media item to share.',
            ]);
        }

        DownloadCenterShare::query()->create([
            'organization_id' => $organization->id,
            'download_center_media_id' => $media->id,
            'shared_by_user_id' => $user?->id,
            'audience' => $validated['audience'],
            'share_group' => $validated['shareGroup'],
            'shared_on' => now()->toDateString(),
            'downloads_count' => 0,
            'is_active' => true,
        ]);

        return redirect()
            ->route('communication.download-center')
            ->with('success', 'Content shared successfully.');
    }

    public function downloadDownloadCenterContent(DownloadCenterShare $downloadCenterShare): BinaryFileResponse|RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $this->canAccessDownloadCenterShare($user, $organization, $downloadCenterShare), 403);

        $media = $downloadCenterShare->media;
        abort_unless($media, 404);

        $downloadCenterShare->increment('downloads_count');

        if ($media->source_kind === 'youtube') {
            return Redirect::away($media->youtube_url);
        }

        abort_unless($media->file_path && Storage::disk('local')->exists($media->file_path), 404);

        return response()->download(
            Storage::disk('local')->path($media->file_path),
            $media->file_name ?: $media->title
        );
    }

    public function previewDownloadCenterContent(DownloadCenterShare $downloadCenterShare): BinaryFileResponse|RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $this->canAccessDownloadCenterShare($user, $organization, $downloadCenterShare), 403);

        $media = $downloadCenterShare->media;
        abort_unless($media, 404);

        if ($media->source_kind === 'youtube') {
            return Redirect::away($media->youtube_url);
        }

        abort_unless($media->file_path && Storage::disk('local')->exists($media->file_path), 404);

        return response()->file(
            Storage::disk('local')->path($media->file_path),
            [
                'Content-Type' => $media->mime_type ?: 'application/octet-stream',
            ]
        );
    }

    private function downloadCenterMediaPayload(Organization $organization): array
    {
        return DownloadCenterMedia::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->with('uploader')
            ->withCount('shares')
            ->latest()
            ->get()
            ->map(fn (DownloadCenterMedia $media) => [
                'id' => (string) $media->id,
                'title' => $media->title,
                'mediaType' => $media->media_type,
                'sourceKind' => $media->source_kind,
                'category' => $media->category,
                'format' => $media->format ?: 'FILE',
                'fileName' => $media->file_name,
                'youtubeUrl' => $media->youtube_url,
                'description' => $media->description ?: '',
                'duration' => $media->duration,
                'size' => $media->source_kind === 'youtube' ? 'YouTube Link' : $this->formatBytes((int) $media->file_size),
                'uploader' => $media->uploader?->name ?: 'School Admin',
                'sharesCount' => (int) $media->shares_count,
                'createdAt' => optional($media->created_at)->format('Y-m-d'),
            ])
            ->all();
    }

    private function staffEmailRecords(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ])
            ->values()
            ->all();
    }

    private function staffMessageRecords(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ])
            ->values()
            ->all();
    }

    private function staffVoiceRecords(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'role' => $user->role,
            ])
            ->values()
            ->all();
    }

    private function studentEmailRecords(Organization $organization): array
    {
        return Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'email' => $student->email,
                'class' => (string) ($student->schoolClass?->name ?? ''),
                'section' => (string) ($student->schoolClass?->section ?? ''),
            ])
            ->values()
            ->all();
    }

    private function studentMessageRecords(Organization $organization): array
    {
        return Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'class' => (string) ($student->schoolClass?->name ?? ''),
                'section' => (string) ($student->schoolClass?->section ?? ''),
                'hasUser' => filled($student->user_id),
            ])
            ->values()
            ->all();
    }

    private function studentVoiceRecords(Organization $organization): array
    {
        return Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'phone' => $this->resolveStudentVoicePhone($student),
                'class' => (string) ($student->schoolClass?->name ?? ''),
                'section' => (string) ($student->schoolClass?->section ?? ''),
            ])
            ->values()
            ->all();
    }

    private function emailHistoryPayload(Organization $organization): array
    {
        if (! Schema::hasTable('email_logs')) {
            return [];
        }

        return EmailLog::query()
            ->where('organization_id', $organization->id)
            ->latest('sent_at')
            ->latest('id')
            ->get()
            ->map(fn (EmailLog $log) => [
                'id' => (string) $log->id,
                'to' => $log->recipient_summary,
                'subject' => $log->subject,
                'preview' => $log->content,
                'sentAt' => optional($log->sent_at)->format('d M Y, h:i A') ?? '',
                'status' => $log->status === 'failed' ? 'Failed' : 'Delivered',
            ])
            ->values()
            ->all();
    }

    private function messageHistoryPayload(Organization $organization, User $user): array
    {
        if (! Schema::hasTable('messages') || ! Schema::hasTable('message_recipients')) {
            return [];
        }

        return Message::query()
            ->where('organization_id', $organization->id)
            ->where('sender_id', $user->id)
            ->where('is_announcement', false)
            ->withCount('recipients')
            ->latest()
            ->get()
            ->filter(fn (Message $message) => ($message->attachments['channel'] ?? null) !== 'whatsapp')
            ->map(fn (Message $message) => [
                'id' => (string) $message->id,
                'subject' => $message->subject,
                'content' => $message->message,
                'to' => $this->messageRecipientSummary($message),
                'time' => optional($message->created_at)->format('d M Y, h:i A') ?? '',
                'status' => 'Sent',
                'recipientCount' => (int) $message->recipients_count,
            ])
            ->values()
            ->all();
    }

    public function whatsappHistoryPayload(Organization $organization, User $user): array
    {
        if (! Schema::hasTable('messages')) {
            return [];
        }

        return Message::query()
            ->where('organization_id', $organization->id)
            ->where('sender_id', $user->id)
            ->latest()
            ->get()
            ->filter(fn (Message $message) => ($message->attachments['channel'] ?? null) === 'whatsapp')
            ->map(function (Message $message) {
                $meta = is_array($message->attachments['whatsapp'] ?? null)
                    ? $message->attachments['whatsapp']
                    : [];

                return [
                    'id' => (string) $message->id,
                    'subject' => $message->subject,
                    'content' => $message->message,
                    'to' => $meta['recipient_summary'] ?? 'WhatsApp recipients',
                    'time' => optional($message->created_at)->format('d M Y, h:i A') ?? '',
                    'status' => ucfirst((string) ($meta['status'] ?? 'sent')),
                    'recipientCount' => (int) ($meta['recipient_count'] ?? 0),
                    'recipientNumbers' => collect($meta['recipient_numbers'] ?? [])->filter()->values()->all(),
                    'accountNumber' => $meta['account_number'] ?? null,
                    'bridgeSession' => $meta['bridge_session'] ?? null,
                    'successfulCount' => (int) ($meta['successful_count'] ?? 0),
                    'failedCount' => (int) ($meta['failed_count'] ?? 0),
                    'pendingCount' => (int) ($meta['pending_count'] ?? 0),
                    'recipients' => collect($meta['recipients'] ?? [])->values()->all(),
                    'responses' => collect($meta['responses'] ?? [])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    private function qwaHistoryPayload(Organization $organization, User $user): array
    {
        if (! Schema::hasTable('messages')) {
            return [];
        }

        return Message::query()
            ->where('organization_id', $organization->id)
            ->where('sender_id', $user->id)
            ->latest()
            ->get()
            ->filter(fn (Message $message) => ($message->attachments['channel'] ?? null) === 'qwa_whatsapp')
            ->map(function (Message $message) {
                $meta = is_array($message->attachments['qwa_whatsapp'] ?? null)
                    ? $message->attachments['qwa_whatsapp']
                    : [];

                return [
                    'id' => (string) $message->id,
                    'subject' => $message->subject,
                    'content' => $message->message,
                    'to' => $meta['recipient_summary'] ?? 'QWA WhatsApp recipients',
                    'time' => optional($message->created_at)->format('d M Y, h:i A') ?? '',
                    'status' => ucfirst((string) ($meta['status'] ?? 'sent')),
                    'recipientCount' => (int) ($meta['recipient_count'] ?? 0),
                    'recipientNumbers' => collect($meta['recipient_numbers'] ?? [])->filter()->values()->all(),
                    'sessionId' => $meta['session_id'] ?? null,
                    'messageType' => $meta['message_type'] ?? 'text',
                    'mediaFilename' => $meta['media_filename'] ?? null,
                    'mediaCaption' => $meta['media_caption'] ?? null,
                    'mediaUrl' => filled($meta['media_path'] ?? null)
                        ? rtrim(request()->getSchemeAndHttpHost(), '/').'/storage/'.ltrim($meta['media_path'], '/')
                        : null,
                    'successfulCount' => (int) ($meta['successful_count'] ?? 0),
                    'failedCount' => (int) ($meta['failed_count'] ?? 0),
                    'pendingCount' => (int) ($meta['pending_count'] ?? 0),
                    'recipients' => collect($meta['recipients'] ?? [])->values()->all(),
                    'responses' => collect($meta['responses'] ?? [])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    private function qwaDeliveryStatusPayload(Organization $organization): array
    {
        $settings = $this->qwaSettings($organization);

        $configured = filled($settings['baseUrl'] ?? null)
            && filled($settings['apiKey'] ?? null)
            && filled($settings['sessionId'] ?? null);

        if (! $configured) {
            return [
                'configured' => false,
                'connected' => false,
                'status' => 'not_configured',
                'statusLabel' => 'Not Configured',
                'sessionId' => null,
                'phone' => null,
                'pushName' => null,
                'message' => 'QWA is not configured. Set it up in Communication Settings.',
            ];
        }

        $sessionCheck = $this->qwaService->sessionStatus($settings['baseUrl'], $settings['apiKey'], $settings['sessionId']);

        if (! $sessionCheck['success']) {
            $statusLabel = match ($sessionCheck['statusCode']) {
                401 => 'Unauthorized',
                404 => 'Not Found',
                503 => 'Unreachable',
                default => 'Error',
            };

            $message = match ($sessionCheck['statusCode']) {
                503 => $sessionCheck['message'],
                401 => 'API key is invalid or not authorized for this session.',
                404 => 'QWA session not found. Check the session ID/name in Communication Settings.',
                default => 'Unable to fetch QWA session status.',
            };

            return [
                'configured' => true,
                'connected' => false,
                'status' => 'error',
                'statusLabel' => $statusLabel,
                'sessionId' => $settings['sessionId'],
                'phone' => null,
                'pushName' => null,
                'message' => $message,
            ];
        }

        $body = is_array($sessionCheck['body']) ? $sessionCheck['body'] : [];
        $status = (string) ($body['status'] ?? 'disconnected');
        $connected = $status === 'ready';

        return [
            'configured' => true,
            'connected' => $connected,
            'status' => $status,
            'statusLabel' => match ($status) {
                'ready' => 'Connected',
                'initializing', 'qr_ready', 'authenticating' => 'Connecting',
                'failed' => 'Failed',
                default => 'Disconnected',
            },
            'sessionId' => $settings['sessionId'],
            'phone' => $body['phone'] ?? null,
            'pushName' => $body['pushName'] ?? null,
            'message' => $connected
                ? 'QWA session is connected.'
                : 'QWA session status: '.$status,
        ];
    }

    private function qwaSettings(Organization $organization): array
    {
        $qwa = array_replace_recursive(
            [
                'enabled' => false,
                'baseUrl' => 'https://qwa.qodeigence.com',
                'apiKey' => '',
                'sessionId' => '',
            ],
            $organization->settings['communication_settings']['qwa'] ?? []
        );

        if (filled($qwa['apiKey'])) {
            try {
                $qwa['apiKey'] = Crypt::decryptString($qwa['apiKey']);
            } catch (Throwable) {
                // Keep the legacy plaintext value.
            }
        }

        return $qwa;
    }

    private function noticeBoardPayload(Organization $organization, User $user): array
    {
        if (! Schema::hasTable('messages') || ! Schema::hasTable('message_recipients')) {
            return [];
        }

        $query = Message::query()
            ->where('organization_id', $organization->id)
            ->where('is_announcement', true)
            ->with(['sender:id,name', 'recipients.recipient:id,role'])
            ->withCount('recipients')
            ->latest();

        if (in_array($user->role, ['student', 'parent'], true)) {
            $query->whereHas('recipients', fn ($recipientQuery) => $recipientQuery->where('recipient_id', $user->id));
        }

        return $query
            ->get()
            ->map(fn (Message $message) => $this->serializeNotice($message))
            ->values()
            ->all();
    }

    private function noticeBoardClassGroups(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $schoolClass) => [
                'value' => sprintf('%s-%s', $schoolClass->name, $schoolClass->section),
                'label' => sprintf('%s - Section %s', $schoolClass->name, $schoolClass->section),
            ])
            ->values()
            ->all();
    }

    private function noticeBoardClassOptions(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->distinct()
            ->pluck('name')
            ->values()
            ->all();
    }

    private function noticeBoardSectionOptions(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->orderBy('section')
            ->distinct()
            ->pluck('section')
            ->values()
            ->all();
    }

    private function voiceCallHistoryPayload(Organization $organization): array
    {
        if (! Schema::hasTable('voice_call_logs')) {
            return [];
        }

        return VoiceCallLog::query()
            ->where('organization_id', $organization->id)
            ->latest('scheduled_for')
            ->latest('id')
            ->get()
            ->map(fn (VoiceCallLog $log) => [
                'id' => (string) $log->id,
                'to' => $log->recipient_summary,
                'subject' => $log->subject,
                'preview' => $log->content ?: 'No additional notes',
                'scheduledFor' => optional($log->scheduled_for)->format('d M Y, h:i A') ?? optional($log->sent_at)->format('d M Y, h:i A') ?? '',
                'status' => ucfirst($log->status),
                'recipientCount' => (int) $log->recipient_count,
                'recipientPhones' => collect($log->recipient_phones ?? [])->filter()->values()->all(),
                'providerName' => $log->provider_name ? strtoupper((string) $log->provider_name) : null,
                'providerReference' => $log->provider_reference,
                'errorMessage' => $log->error_message,
                'audioFileName' => $log->audio_file_name,
                'audioUrl' => $log->audio_file_path ? route('communication.voice-calls.audio', $log) : null,
                'sentAt' => optional($log->sent_at)->format('d M Y, h:i A') ?? null,
            ])
            ->values()
            ->all();
    }

    private function smsHistoryPayload(Organization $organization): array
    {
        if (! Schema::hasTable('sms_logs')) {
            return [];
        }

        return SmsLog::query()
            ->where('organization_id', $organization->id)
            ->latest('queued_at')
            ->latest('id')
            ->get()
            ->map(fn (SmsLog $log) => [
                'id' => (string) $log->id,
                'to' => $log->recipient_summary,
                'subject' => $log->subject,
                'preview' => $log->content,
                'queuedAt' => optional($log->queued_at)->format('d M Y, h:i A') ?? '',
                'status' => ucfirst($log->status),
                'recipientCount' => (int) $log->recipient_count,
                'recipientPhones' => collect($log->recipient_phones ?? [])->filter()->values()->all(),
                'providerName' => $log->provider_name ? strtoupper((string) $log->provider_name) : null,
                'providerReference' => $log->provider_reference,
                'errorMessage' => $log->error_message,
                'sentAt' => optional($log->sent_at)->format('d M Y, h:i A') ?? null,
            ])
            ->values()
            ->all();
    }

    private function smsConfigurationStatus(Organization $organization): array
    {
        $smsSettings = $this->smsSettings($organization);

        return [
            'enabled' => (bool) ($smsSettings['enabled'] ?? false),
            'configured' => $this->smsService->isConfigured($smsSettings),
            'provider' => $smsSettings['provider'] ?? null,
            'providerSupported' => $this->smsService->driverFor($smsSettings) !== null,
        ];
    }

    private function dispatchSmsForRecipients(Organization $organization, Collection $recipientUsers, string $subject, ?string $content): ?SmsLog
    {
        $smsConfiguration = $this->smsConfigurationStatus($organization);

        if (! $smsConfiguration['configured']) {
            return null;
        }

        $recipientPhones = $recipientUsers
            ->pluck('phone')
            ->filter()
            ->map(fn (?string $phone) => $this->normalizePhoneNumber($phone))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($recipientPhones === []) {
            return null;
        }

        $resolvedContent = trim((string) ($content ?? ''));

        $smsLog = SmsLog::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => Auth::user()?->id,
            'audience_type' => 'community_message',
            'recipient_summary' => $recipientUsers->pluck('name')->filter()->slice(0, 3)->implode(', ').(($recipientUsers->count() > 3) ? ' + Others' : ''),
            'recipient_count' => count($recipientPhones),
            'recipient_phones' => $recipientPhones,
            'recipient_details' => collect($recipientPhones)
                ->mapWithKeys(fn (string $phone) => [
                    $phone => [
                        'phone' => $phone,
                        'status' => 'queued',
                        'queued_at' => now()->toDateTimeString(),
                        'sent_at' => null,
                        'failed_reason' => null,
                    ],
                ])
                ->all(),
            'subject' => $subject,
            'content' => $resolvedContent !== '' ? $resolvedContent : $subject,
            'status' => 'queued',
            'queued_at' => now(),
            'provider_name' => $smsConfiguration['provider'] ?? null,
        ]);

        foreach ($recipientPhones as $phone) {
            SendSmsJob::dispatch(
                $smsLog->id,
                $organization->id,
                $phone,
            )->onQueue('default');
        }

        return $smsLog;
    }

    private function smsSettings(Organization $organization): array
    {
        return $organization->settings['communication_settings']['sms'] ?? [];
    }

    public function isWhatsappMessage(Message $message): bool
    {
        return ($message->attachments['channel'] ?? null) === 'whatsapp';
    }

    private function resolveEmailRecipients(Organization $organization, array $validated): array
    {
        $staffQuery = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active');

        $studentQuery = Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active');

        return match ($validated['audienceType']) {
            'staff' => $this->resolveStaffRecipients($staffQuery, $validated['selectedStaffRoles'] ?? []),
            'students' => $this->resolveAllStudentRecipients($studentQuery),
            'class_section' => $this->resolveClassSectionRecipients($studentQuery, $validated['selectedGroups'] ?? []),
            'individual_staff' => $this->resolveIndividualStaffRecipients($staffQuery, $validated['selectedStaffUsers'] ?? []),
            'individual_students' => $this->resolveIndividualStudentRecipients($studentQuery, $validated['selectedStudents'] ?? []),
            default => [collect(), ''],
        };
    }

    private function resolveMessageRecipients(Organization $organization, array $validated): array
    {
        $staffQuery = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active');

        $studentQuery = Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->whereNotNull('user_id');

        return match ($validated['audienceType']) {
            'staff' => $this->resolveStaffMessageRecipients($staffQuery, $validated['selectedStaffRoles'] ?? []),
            'students' => $this->resolveAllStudentMessageRecipients($studentQuery),
            'class_section' => $this->resolveClassSectionMessageRecipients($studentQuery, $validated['selectedGroups'] ?? []),
            default => [collect(), ''],
        };
    }

    private function resolveNoticeRecipients(Organization $organization, array $validated): array
    {
        $staffQuery = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active');

        $studentQuery = Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->whereNotNull('user_id');

        return match ($validated['audienceType']) {
            'staff' => $this->resolveStaffMessageRecipients($staffQuery, []),
            'students' => $this->resolveAllStudentMessageRecipients($studentQuery),
            'class_section' => $this->resolveClassSectionMessageRecipients($studentQuery, $validated['selectedGroups'] ?? []),
            'both' => $this->resolveNoticeRecipientsForBoth($staffQuery, $studentQuery),
            default => [collect(), ''],
        };
    }

    private function resolveNoticeRecipientsForBoth($staffQuery, $studentQuery): array
    {
        [$staffUsers] = $this->resolveStaffMessageRecipients($staffQuery, []);
        [$studentUsers] = $this->resolveAllStudentMessageRecipients($studentQuery);

        return [$staffUsers->concat($studentUsers)->unique('id')->values(), 'School Community'];
    }

    private function resolveVoiceRecipients(Organization $organization, array $validated): array
    {
        $staffQuery = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active');

        $studentQuery = Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where('status', 'active');

        return match ($validated['audienceType']) {
            'staff' => $this->resolveStaffVoiceRecipients($staffQuery, $validated['selectedStaffRoles'] ?? []),
            'students' => $this->resolveAllStudentVoiceRecipients($studentQuery),
            'class_section' => $this->resolveClassSectionVoiceRecipients($studentQuery, $validated['selectedGroups'] ?? []),
            default => [collect(), ''],
        };
    }

    private function resolveStaffRecipients($query, array $roles): array
    {
        $selectedRoles = collect($roles)->filter()->values();

        if ($selectedRoles->isNotEmpty()) {
            $query->whereIn('role', $selectedRoles->all());
        }

        $users = $query->get();
        $recipients = $users
            ->filter(fn (User $user) => $this->isDeliverableEmail($user->email))
            ->map(fn (User $user) => [
                'email' => $user->email,
                'name' => $user->name,
            ])
            ->values();

        $summary = $selectedRoles->isNotEmpty()
            ? $selectedRoles->map(fn (string $role) => ucfirst(str_replace('_', ' ', $role)).'s')->implode(', ')
            : 'All Staff';

        return [$recipients, $summary];
    }

    private function resolveAllStudentRecipients($query): array
    {
        $students = $query->get();

        $recipients = $students
            ->filter(fn (Student $student) => $this->isDeliverableEmail($student->email))
            ->map(fn (Student $student) => [
                'email' => $student->email,
                'name' => trim($student->first_name.' '.$student->last_name),
            ])
            ->values();

        return [$recipients, 'All Students'];
    }

    private function resolveStaffMessageRecipients($query, array $roles): array
    {
        $selectedRoles = collect($roles)->filter()->values();

        if ($selectedRoles->isNotEmpty()) {
            $query->whereIn('role', $selectedRoles->all());
        }

        $users = $query->get()->unique('id')->values();

        $summary = $selectedRoles->isNotEmpty()
            ? $selectedRoles->map(fn (string $role) => ucfirst(str_replace('_', ' ', $role)).'s')->implode(', ')
            : 'All Staff';

        return [$users, $summary];
    }

    private function resolveAllStudentMessageRecipients($query): array
    {
        $students = $query->get();
        $users = User::query()
            ->whereIn('id', $students->pluck('user_id')->filter()->unique()->values()->all())
            ->where('status', 'active')
            ->get()
            ->unique('id')
            ->values();

        return [$users, 'All Students'];
    }

    private function resolveClassSectionMessageRecipients($query, array $groups): array
    {
        $selectedGroups = collect($groups)->filter()->values();

        $students = $query->get()->filter(function (Student $student) use ($selectedGroups) {
            $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);

            return $selectedGroups->contains($groupKey);
        });

        $users = User::query()
            ->whereIn('id', $students->pluck('user_id')->filter()->unique()->values()->all())
            ->where('status', 'active')
            ->get()
            ->unique('id')
            ->values();

        return [$users, 'Students of '.$selectedGroups->implode(', ')];
    }

    private function resolveStaffVoiceRecipients($query, array $roles): array
    {
        $selectedRoles = collect($roles)->filter()->values();

        if ($selectedRoles->isNotEmpty()) {
            $query->whereIn('role', $selectedRoles->all());
        }

        $users = $query->get();
        $recipients = $users
            ->map(fn (User $user) => [
                'phone' => $this->normalizePhoneNumber($user->phone),
                'name' => $user->name,
            ])
            ->filter(fn (array $recipient) => filled($recipient['phone']))
            ->unique('phone')
            ->values();

        $summary = $selectedRoles->isNotEmpty()
            ? $selectedRoles->map(fn (string $role) => ucfirst(str_replace('_', ' ', $role)).'s')->implode(', ')
            : 'All Staff';

        return [$recipients, $summary];
    }

    private function resolveAllStudentVoiceRecipients($query): array
    {
        $students = $query->get();
        $recipients = $students
            ->map(fn (Student $student) => [
                'phone' => $this->resolveStudentVoicePhone($student),
                'name' => trim($student->first_name.' '.$student->last_name),
            ])
            ->filter(fn (array $recipient) => filled($recipient['phone']))
            ->unique('phone')
            ->values();

        return [$recipients, 'All Students'];
    }

    private function resolveClassSectionVoiceRecipients($query, array $groups): array
    {
        $selectedGroups = collect($groups)
            ->filter(fn ($group) => is_string($group) && str_contains($group, '-'))
            ->values();

        if ($selectedGroups->isEmpty()) {
            return [collect(), ''];
        }

        $students = $query->get()->filter(function (Student $student) use ($selectedGroups) {
            $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);

            return $selectedGroups->contains($groupKey);
        });

        $recipients = $students
            ->map(fn (Student $student) => [
                'phone' => $this->resolveStudentVoicePhone($student),
                'name' => trim($student->first_name.' '.$student->last_name),
            ])
            ->filter(fn (array $recipient) => filled($recipient['phone']))
            ->unique('phone')
            ->values();

        return [$recipients, 'Students of '.$selectedGroups->implode(', ')];
    }

    private function resolveClassSectionRecipients($query, array $groups): array
    {
        $selectedGroups = collect($groups)->filter()->values();

        $students = $query->get()->filter(function (Student $student) use ($selectedGroups) {
            $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);

            return $selectedGroups->contains($groupKey);
        });

        $recipients = $students
            ->filter(fn (Student $student) => $this->isDeliverableEmail($student->email))
            ->map(fn (Student $student) => [
                'email' => $student->email,
                'name' => trim($student->first_name.' '.$student->last_name),
            ])
            ->values();

        return [$recipients, 'Students of '.$selectedGroups->implode(', ')];
    }

    private function resolveIndividualStaffRecipients($query, array $ids): array
    {
        $users = $query->whereIn('id', collect($ids)->filter()->map(fn ($id) => (int) $id)->all())->get();

        $recipients = $users
            ->filter(fn (User $user) => $this->isDeliverableEmail($user->email))
            ->map(fn (User $user) => [
                'email' => $user->email,
                'name' => $user->name,
            ])
            ->values();

        return [$recipients, $users->pluck('name')->implode(', ')];
    }

    private function resolveIndividualStudentRecipients($query, array $ids): array
    {
        $students = $query->whereIn('id', collect($ids)->filter()->map(fn ($id) => (int) $id)->all())->get();

        $recipients = $students
            ->filter(fn (Student $student) => $this->isDeliverableEmail($student->email))
            ->map(fn (Student $student) => [
                'email' => $student->email,
                'name' => trim($student->first_name.' '.$student->last_name),
            ])
            ->values();

        return [$recipients, $students->map(fn (Student $student) => trim($student->first_name.' '.$student->last_name))->implode(', ')];
    }

    private function configureOutgoingMail(): bool
    {
        if (! Schema::hasTable('super_admin_settings')) {
            return false;
        }

        $settings = SuperAdminSetting::query()->first();

        if (! $settings || ! $settings->is_active || ! $settings->from_email) {
            return false;
        }

        Config::set('mail.default', $settings->mailer);
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $settings->smtp_host);
        Config::set('mail.mailers.smtp.port', $settings->smtp_port);
        Config::set('mail.mailers.smtp.username', $settings->smtp_username);
        Config::set('mail.mailers.smtp.password', $settings->smtp_password);
        Config::set('mail.mailers.smtp.encryption', $settings->smtp_encryption);
        Config::set('mail.from.address', $settings->from_email);
        Config::set('mail.from.name', $settings->from_name ?: 'Gurukul ERP');

        if ($settings->reply_to_email) {
            Config::set('mail.reply_to.address', $settings->reply_to_email);
            Config::set('mail.reply_to.name', $settings->from_name ?: 'Gurukul ERP');
        }

        return true;
    }

    private function isDeliverableEmail(?string $email): bool
    {
        return filled($email) && ! str_ends_with((string) $email, '.local');
    }

    private function downloadCenterSharesPayload(Organization $organization, User $user): array
    {
        $query = DownloadCenterShare::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->with(['media.uploader'])
            ->latest('shared_on')
            ->latest('id');

        if ($user->role === 'student') {
            $studentShareGroups = $this->studentDownloadCenterShareGroups($organization, $user);

            $query
                ->whereIn('audience', ['students', 'both'])
                ->where(function ($shareQuery) use ($studentShareGroups) {
                    $shareQuery->where('share_group', 'all-students');

                    if ($studentShareGroups !== []) {
                        $shareQuery->orWhereIn('share_group', $studentShareGroups);
                    }
                });
        } elseif (! $this->canManageDownloadCenter($user)) {
            $query->whereIn('audience', ['students', 'both']);
        }

        return $query
            ->get()
            ->filter(fn (DownloadCenterShare $share) => $share->media !== null)
            ->map(function (DownloadCenterShare $share) {
                $media = $share->media;

                return [
                    'id' => (string) $share->id,
                    'title' => $media->title,
                    'contentType' => $media->media_type,
                    'category' => $media->category,
                    'audience' => $share->audience,
                    'shareGroup' => $share->share_group,
                    'format' => $media->format ?: 'FILE',
                    'sharedOn' => optional($share->shared_on)->format('Y-m-d') ?: optional($share->created_at)->format('Y-m-d'),
                    'downloads' => (int) $share->downloads_count,
                    'uploader' => $media->uploader?->name ?: 'School Admin',
                    'size' => $media->source_kind === 'youtube' ? 'YouTube Link' : $this->formatBytes((int) $media->file_size),
                    'description' => $media->description ?: '',
                    'duration' => $media->duration,
                    'fileName' => $media->file_name,
                    'sourceKind' => $media->source_kind,
                    'youtubeUrl' => $media->youtube_url,
                    'downloadUrl' => route('communication.download-center.download', $share),
                    'previewUrl' => route('communication.download-center.preview', $share),
                ];
            })
            ->values()
            ->all();
    }

    private function studentDownloadCenterShareGroups(Organization $organization, User $user): array
    {
        $student = Student::query()
            ->with('schoolClass:id,name,section')
            ->forCurrentSession($organization->id)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);

                if (filled($user->email)) {
                    $query->orWhere('email', $user->email);
                }
            })
            ->first();

        if (! $student?->schoolClass) {
            return [];
        }

        $className = (string) $student->schoolClass->name;
        $section = (string) $student->schoolClass->section;

        return array_values(array_unique(array_filter([
            sprintf('%s-%s', $className, $section),
            sprintf('class-%s-%s', Str::slug($className, '-'), Str::slug($section, '-')),
        ])));
    }

    private function downloadCenterShareGroups(Organization $organization): array
    {
        $classSectionGroups = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => sprintf('class-%s-%s', str($schoolClass->name)->slug('-'), str($schoolClass->section)->slug('-')),
                'label' => sprintf('%s - Section %s', $schoolClass->name, $schoolClass->section),
            ])
            ->all();

        return [
            ['id' => 'all-students', 'label' => 'All Students'],
            ['id' => 'all-staff', 'label' => 'All Staff'],
            ...$classSectionGroups,
        ];
    }

    private function downloadCenterUploadLimits(): array
    {
        $uploadMaxBytes = $this->parseIniSize((string) ini_get('upload_max_filesize'));
        $postMaxBytes = $this->parseIniSize((string) ini_get('post_max_size'));
        $maxBytes = min($uploadMaxBytes, $postMaxBytes);

        return [
            'uploadMaxLabel' => (string) ini_get('upload_max_filesize'),
            'postMaxLabel' => (string) ini_get('post_max_size'),
            'maxBytes' => $maxBytes,
            'maxLabel' => $this->formatBytes($maxBytes),
        ];
    }

    private function canManageDownloadCenter(?User $user): bool
    {
        return $user !== null && ! in_array($user->role, ['student', 'parent'], true);
    }

    private function canAccessDownloadCenterShare(?User $user, Organization $organization, DownloadCenterShare $share): bool
    {
        if (! $user || $share->organization_id !== $organization->id) {
            return false;
        }

        if ($this->canManageDownloadCenter($user)) {
            return true;
        }

        return in_array($share->audience, ['students', 'both'], true);
    }

    private function messageRecipientSummary(Message $message): string
    {
        $recipientCount = (int) ($message->recipients_count ?? 0);

        if ($recipientCount === 0) {
            return 'No recipients';
        }

        $sampleRoles = MessageRecipient::query()
            ->where('message_id', $message->id)
            ->with('recipient:id,role')
            ->limit(5)
            ->get()
            ->pluck('recipient.role')
            ->filter()
            ->unique()
            ->values();

        if ($sampleRoles->isEmpty()) {
            return $recipientCount.' recipients';
        }

        return sprintf(
            '%s%s',
            $sampleRoles->map(fn (string $role) => ucfirst(str_replace('_', ' ', $role)).'s')->implode(', '),
            $recipientCount > $sampleRoles->count() ? sprintf(' (%d recipients)', $recipientCount) : ''
        );
    }

    private function validateNoticePayload(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'audienceType' => ['required', Rule::in(['students', 'staff', 'both', 'class_section'])],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'pinned' => ['boolean'],
        ]);
    }

    private function serializeNotice(Message $message): array
    {
        $noticeMeta = is_array($message->attachments['notice_board'] ?? null)
            ? $message->attachments['notice_board']
            : [];

        return [
            'id' => (string) $message->id,
            'title' => $message->subject,
            'audience' => $noticeMeta['audience_label'] ?? $this->messageRecipientSummary($message),
            'audienceType' => $noticeMeta['audience_type'] ?? 'both',
            'selectedGroups' => is_array($noticeMeta['selected_groups'] ?? null) ? $noticeMeta['selected_groups'] : [],
            'publishedOn' => optional($message->created_at)->format('d M Y') ?? '',
            'description' => $message->message,
            'pinned' => $message->priority === 'high',
            'createdBy' => $message->sender?->name ?? 'School Admin',
        ];
    }

    private function isOrganizationNotice(Organization $organization, Message $message): bool
    {
        return (int) $message->organization_id === (int) $organization->id
            && (bool) $message->is_announcement;
    }

    private function canManageNotices(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->role === 'super_admin') {
            return true;
        }

        if (in_array($user->role, ['student', 'parent'], true)) {
            return false;
        }

        return $this->staffPermissionService->allows($user, 'Notice Board', 'add')
            || $this->staffPermissionService->allows($user, 'Notice Board', 'edit')
            || $this->staffPermissionService->allows($user, 'Notice Board', 'delete');
    }

    private function bridgeStatusPayload(Organization $organization): array
    {
        if (! $this->whatsappBridgeService->isConfigured()) {
            return [
                'configured' => false,
                'connected' => false,
                'status' => 'disconnected',
                'session' => null,
                'account' => null,
                'accountNumber' => null,
                'qrCode' => null,
                'message' => 'WhatsApp bridge URL is not configured.',
            ];
        }

        $session = $this->currentWhatsappBridgeSession($organization);
        $statusResult = $this->whatsappBridgeService->status($session);
        $session = $statusResult['session'] ?? $session;
        $this->persistWhatsappBridgeSession($organization, $session);

        $status = (string) ($statusResult['status'] ?? 'disconnected');
        $account = $statusResult['account'] ?? null;
        $connected = $this->isWhatsappBridgeConnected($status, $account);
        $qrResult = null;

        if (! $connected) {
            $qrResult = $this->whatsappBridgeService->qr($session);
            $session = $qrResult['session'] ?? $session;
            $this->persistWhatsappBridgeSession($organization, $session);
        }

        return [
            'configured' => true,
            'connected' => $connected,
            'status' => $connected ? 'connected' : 'disconnected',
            'bridgeStatus' => $status,
            'session' => $session,
            'account' => $account,
            'accountNumber' => $this->extractWhatsappAccountNumber($account),
            'qrCode' => $this->normalizeWhatsappQrCode($qrResult['body']['qrCode'] ?? null),
            'message' => $statusResult['message'] ?? null,
        ];
    }

    private function queueWorkerStatusPayload(): array
    {
        $status = [
            'running' => null,
            'processCount' => 0,
            'queue' => 'imports, whatsapp, default',
            'pendingJobs' => null,
            'reservedJobs' => null,
            'checkedAt' => now()->toDateTimeString(),
            'message' => 'Unable to inspect queue worker processes on this server.',
        ];

        if ($this->isFunctionAvailable('exec') && PHP_OS_FAMILY !== 'Windows') {
            $output = [];
            $exitCode = 1;
            exec('ps -eo pid=,command=', $output, $exitCode);

            if ($exitCode === 0) {
                $workerProcesses = collect($output)->filter(function (string $line) {
                    return str_contains($line, 'artisan')
                        && (str_contains($line, 'queue:work') || str_contains($line, 'queue:listen'));
                });

                $status['processCount'] = $workerProcesses->count();
                $status['running'] = $status['processCount'] > 0;
                $status['message'] = $status['running']
                    ? 'Queue worker is running.'
                    : 'Queue worker is not running.';
            }
        }

        $queueConnection = config('queue.default');
        $connectionConfig = config("queue.connections.{$queueConnection}");

        if (($connectionConfig['driver'] ?? null) === 'database') {
            $table = $connectionConfig['table'] ?? 'jobs';

            try {
                $connection = $connectionConfig['connection'] ?? null;

                if (Schema::connection($connection)->hasTable($table)) {
                    $jobsQuery = DB::connection($connection)->table($table)->where('queue', 'whatsapp');

                    $status['pendingJobs'] = (clone $jobsQuery)->whereNull('reserved_at')->count();
                    $status['reservedJobs'] = (clone $jobsQuery)->whereNotNull('reserved_at')->count();
                }
            } catch (Throwable) {
                $status['pendingJobs'] = null;
                $status['reservedJobs'] = null;
            }
        }

        return $status;
    }

    private function isFunctionAvailable(string $function): bool
    {
        if (! function_exists($function)) {
            return false;
        }

        $disabledFunctions = array_map('trim', explode(',', (string) ini_get('disable_functions')));

        return ! in_array($function, $disabledFunctions, true);
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        return $this->staffPermissionService->resolveOrganizationForUser($user);
    }

    private function currentWhatsappBridgeSession(Organization $organization): ?string
    {
        $key = $this->whatsappBridgeSessionKey($organization);
        $session = session($key) ?: Cache::get($key);

        return filled($session) ? (string) $session : null;
    }

    private function persistWhatsappBridgeSession(Organization $organization, ?string $session): void
    {
        if ($this->currentWhatsappBridgeSession($organization) === $session) {
            return;
        }

        $key = $this->whatsappBridgeSessionKey($organization);

        if (filled($session)) {
            session([$key => $session]);
            Cache::forever($key, $session);

            return;
        }

        session()->forget($key);
        Cache::forget($key);
    }

    private function isWhatsappBridgeConnected(?string $status, mixed $account): bool
    {
        if (is_array($account) && filled($this->extractWhatsappAccountNumber($account))) {
            return true;
        }

        return in_array((string) $status, ['connected', 'ready', 'authenticated'], true);
    }

    private function extractWhatsappAccountNumber(mixed $account): ?string
    {
        if (is_string($account) && filled($account)) {
            return $account;
        }

        if (! is_array($account)) {
            return null;
        }

        foreach (['phone', 'number', 'wid', 'id'] as $key) {
            if (filled($account[$key] ?? null)) {
                return (string) $account[$key];
            }
        }

        return null;
    }

    private function normalizeWhatsappQrCode(mixed $qrCode): ?string
    {
        if (! is_string($qrCode) || trim($qrCode) === '') {
            return null;
        }

        $value = trim($qrCode);

        if (str_starts_with($value, 'data:image')) {
            return $value;
        }

        return 'data:image/png;base64,'.$value;
    }

    private function whatsappBridgeSessionKey(Organization $organization): string
    {
        return 'whatsapp_bridge_session.organization_'.$organization->id;
    }

    private function smartfloVoiceSettings(Organization $organization): array
    {
        return array_replace_recursive($this->defaultVoiceSettings(), $organization->settings['communication_settings']['voice'] ?? []);
    }

    private function hasSmartfloVoiceConfiguration(Organization $organization): bool
    {
        $settings = $this->smartfloVoiceSettings($organization);

        return (bool) ($settings['enabled'] ?? false)
            && filled($settings['apiKey'] ?? null)
            && filled($settings['callerId'] ?? null);
    }

    private function defaultVoiceSettings(): array
    {
        return [
            'enabled' => false,
            'provider' => 'Smartflo',
            'apiKey' => '',
            'callerId' => '',
            'ringTimeout' => 30,
            'callTimeout' => 60,
        ];
    }

    private function resolveStudentVoicePhone(Student $student): ?string
    {
        foreach ([
            $student->phone,
            $student->father_phone,
            $student->mother_phone,
            $student->guardian_phone,
            $student->emergency_contact_phone,
        ] as $phone) {
            $normalizedPhone = $this->normalizePhoneNumber($phone);

            if ($normalizedPhone) {
                return $normalizedPhone;
            }
        }

        return null;
    }

    private function normalizePhoneNumber(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);
        $defaultCountryCode = preg_replace('/\D+/', '', (string) config('services.whatsapp_bridge.country_code', '91'));

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) === 10 && filled($defaultCountryCode)) {
            $digits = $defaultCountryCode.$digits;
        }

        $length = strlen($digits);

        if ($length < 10 || $length > 15) {
            return null;
        }

        return $digits;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return number_format($bytes / (1024 * 1024), 1).' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024).' KB';
        }

        return $bytes.' bytes';
    }

    private function parseIniSize(string $value): int
    {
        $normalized = trim($value);

        if ($normalized === '') {
            return 0;
        }

        $unit = strtolower(substr($normalized, -1));
        $number = (float) $normalized;

        return match ($unit) {
            'g' => (int) round($number * 1024 * 1024 * 1024),
            'm' => (int) round($number * 1024 * 1024),
            'k' => (int) round($number * 1024),
            default => (int) round($number),
        };
    }

    private function dispatchPushNotificationForMessage(Message $message, array $recipientIds, bool $sendNotification, string $recipientSummary): array
    {
        if (! $sendNotification) {
            return ['attempted' => false, 'configured' => true, 'attemptedCount' => 0, 'successCount' => 0, 'failureCount' => 0];
        }

        try {
            $result = $this->firebaseCloudMessagingService->sendToUsers(
                $recipientIds,
                $message->subject,
                Str::limit($message->message, 160),
                [
                    'type' => 'message',
                    'message_id' => (string) $message->id,
                    'organization_id' => (string) $message->organization_id,
                    'priority' => (string) ($message->priority ?? 'normal'),
                    'is_announcement' => $message->is_announcement ? '1' : '0',
                ],
            );

            $attachments = $message->attachments ?? [];
            $attachments['push_notification'] = $result;
            $message->update(['attachments' => $attachments]);

            return array_merge(['attempted' => true], $result);
        } catch (Throwable $e) {
            report($e);

            return ['attempted' => true, 'configured' => true, 'attemptedCount' => 0, 'successCount' => 0, 'failureCount' => 0, 'error' => $e->getMessage()];
        }
    }

    private function dispatchVoiceCallPushNotification(
        Organization $organization,
        User $sender,
        array $validated,
        Collection $recipientContacts,
        ?string $audioFilePath
    ): void {
        $sendNotification = (bool) ($validated['sendNotification'] ?? true);

        if (! $sendNotification) {
            return;
        }

        $staffQuery = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
            ->where('status', 'active');

        $studentQuery = Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereNotNull('user_id');

        $recipientUserIds = match ($validated['audienceType']) {
            'staff' => $this->resolveStaffVoiceUserIds($staffQuery, $validated['selectedStaffRoles'] ?? []),
            'students' => $this->resolveAllStudentVoiceUserIds($studentQuery),
            'class_section' => $this->resolveClassSectionVoiceUserIds($studentQuery, $validated['selectedGroups'] ?? []),
            default => [],
        };

        if (empty($recipientUserIds)) {
            return;
        }

        try {
            $audioUrl = $audioFilePath
                ? url('/storage/'.$audioFilePath)
                : null;

            $data = [
                'type' => 'voice_call',
                'organization_id' => (string) $organization->id,
            ];

            if ($audioUrl) {
                $data['audio_url'] = $audioUrl;
                $data['has_audio'] = '1';
            }

            $this->firebaseCloudMessagingService->sendToUsers(
                $recipientUserIds,
                'Voice Call: '.$validated['subject'],
                Str::limit($validated['content'] ?? 'You have a new voice call notification.', 160),
                $data,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function resolveStaffVoiceUserIds($query, array $roles): array
    {
        $selectedRoles = collect($roles)->filter()->values();

        if ($selectedRoles->isNotEmpty()) {
            $query->whereIn('role', $selectedRoles->all());
        }

        return $query->pluck('id')->unique()->values()->all();
    }

    private function resolveAllStudentVoiceUserIds($query): array
    {
        return $query->pluck('user_id')->filter()->unique()->values()->all();
    }

    private function resolveClassSectionVoiceUserIds($query, array $groups): array
    {
        $selectedGroups = collect($groups)->filter()->values();

        if ($selectedGroups->isEmpty()) {
            return [];
        }

        $students = $query->get()->filter(function (Student $student) use ($selectedGroups) {
            $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);

            return $selectedGroups->contains($groupKey);
        });

        return $students->pluck('user_id')->filter()->unique()->values()->all();
    }

    public function serveVoiceCallAudio(VoiceCallLog $voiceCallLog)
    {
        $user = Auth::user() ?? Auth::guard('sanctum')->user();

        abort_unless($user, 403);

        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $voiceCallLog->organization_id === (int) $organization->id, 404);

        if ($voiceCallLog->audio_file_path) {
            $path = storage_path('app/public/'.$voiceCallLog->audio_file_path);

            if (! file_exists($path)) {
                abort(404);
            }

            $headers = [
                'Content-Type' => $voiceCallLog->audio_mime_type ?: 'audio/mpeg',
                'Content-Disposition' => 'inline; filename="'.($voiceCallLog->audio_file_name ?: 'audio.mp3').'"',
            ];

            return response()->file($path, $headers);
        }

        abort(404);
    }
}
