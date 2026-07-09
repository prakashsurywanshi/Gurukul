<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DownloadCenterMedia;
use App\Models\DownloadCenterShare;
use App\Models\EmailLog;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\SuperAdminSetting;
use App\Models\User;
use App\Models\VoiceCallLog;
use App\Services\FirebaseCloudMessagingService;
use App\Services\SmartfloService;
use App\Services\StaffPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class CommunicationApiController extends Controller
{
    public function __construct(
        private readonly SmartfloService $smartfloService,
        private readonly StaffPermissionService $staffPermissionService,
        private readonly FirebaseCloudMessagingService $firebaseCloudMessagingService,
    ) {
    }

    // ==================== MESSAGES ====================

    public function indexMessages(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $filter = $request->input('filter', 'inbox');
        $query = Message::query()
            ->where('organization_id', $organization->id)
            ->with(['sender:id,name,role'])
            ->latest();

        if ($filter === 'inbox') {
            $query->whereHas('recipients', fn ($q) => $q->where('recipient_id', $user->id)->where('is_archived', false));
        } elseif ($filter === 'starred') {
            $query->whereHas('recipients', fn ($q) => $q->where('recipient_id', $user->id)->where('is_starred', true));
        } elseif ($filter === 'sent') {
            $query->where('sender_id', $user->id);
        } elseif ($filter === 'archived') {
            $query->whereHas('recipients', fn ($q) => $q->where('recipient_id', $user->id)->where('is_archived', true));
        }

        $messages = $query->limit(200)->get()->map(function (Message $message) use ($user) {
            $recipientRecord = $message->recipients()->where('recipient_id', $user->id)->first();

            return [
                'id' => (string) $message->id,
                'subject' => $message->subject,
                'message' => $message->message,
                'sender' => $message->sender?->name ?? 'Unknown',
                'senderRole' => $message->sender?->role ?? '',
                'createdAt' => optional($message->created_at)->format('Y-m-d H:i:s'),
                'isRead' => (bool) optional($recipientRecord)->is_read,
                'isStarred' => (bool) optional($recipientRecord)->is_starred,
                'isArchived' => (bool) optional($recipientRecord)->is_archived,
                'priority' => $message->priority ?? 'normal',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $messages,
            'filter' => $filter,
        ]);
    }

    public function showMessage(Request $request, int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $message = Message::query()
            ->where('organization_id', $organization->id)
            ->with(['sender:id,name,role'])
            ->find($id);

        if (! $message) {
            return response()->json(['success' => false, 'message' => 'Message not found.'], 404);
        }

        $recipientRecord = MessageRecipient::query()
            ->where('message_id', $message->id)
            ->where('recipient_id', $user->id)
            ->first();

        if (! $recipientRecord && (int) $message->sender_id !== (int) $user->id) {
            return response()->json(['success' => false, 'message' => 'Access denied.'], 403);
        }

        if ($recipientRecord && ! $recipientRecord->is_read) {
            $recipientRecord->update(['is_read' => true, 'read_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $message->id,
                'subject' => $message->subject,
                'message' => $message->message,
                'sender' => $message->sender?->name ?? 'Unknown',
                'senderRole' => $message->sender?->role ?? '',
                'createdAt' => optional($message->created_at)->format('Y-m-d H:i:s'),
                'isRead' => (bool) optional($recipientRecord)->is_read,
                'isStarred' => (bool) optional($recipientRecord)->is_starred,
                'priority' => $message->priority ?? 'normal',
                'attachments' => $message->attachments ?? [],
            ],
        ]);
    }

    public function sendMessage(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section', 'individual_staff', 'individual_students'])],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'priority' => ['nullable', Rule::in(['normal', 'high'])],
            'sendNotification' => ['nullable', 'boolean'],
        ]);

        [$recipients, $recipientSummary] = $this->resolveMessageRecipients(
            $organization,
            $validated['audienceType'],
            $validated['selectedGroups'] ?? [],
        );

        if ($recipients->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No valid recipients found.'], 422);
        }

        $message = Message::create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'priority' => $validated['priority'] ?? 'normal',
            'is_announcement' => false,
            'attachments' => [],
        ]);

        $recipientIds = $recipients->pluck('id')->unique()->values();

        foreach ($recipientIds as $recipientId) {
            MessageRecipient::create([
                'message_id' => $message->id,
                'recipient_id' => $recipientId,
                'is_read' => false,
                'is_starred' => false,
                'is_archived' => false,
            ]);
        }

        $message->load(['sender:id,name']);
        $pushResult = $this->dispatchPushNotificationForMessage(
            $message,
            $recipientIds->all(),
            $validated['sendNotification'] ?? true,
            $recipientSummary,
        );

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => [
                'id' => (string) $message->id,
                'recipientCount' => $recipientIds->count(),
                'recipientSummary' => $recipientSummary,
                'notification' => $pushResult,
            ],
        ], 201);
    }

    public function toggleMessageStar(Request $request, int $id)
    {
        $user = Auth::user();

        $recipientRecord = MessageRecipient::query()
            ->where('message_id', $id)
            ->where('recipient_id', $user->id)
            ->first();

        if (! $recipientRecord) {
            return response()->json(['success' => false, 'message' => 'Message not found.'], 404);
        }

        $recipientRecord->update(['is_starred' => ! $recipientRecord->is_starred]);

        return response()->json([
            'success' => true,
            'isStarred' => $recipientRecord->is_starred,
        ]);
    }

    public function archiveMessage(Request $request, int $id)
    {
        $user = Auth::user();

        $recipientRecord = MessageRecipient::query()
            ->where('message_id', $id)
            ->where('recipient_id', $user->id)
            ->first();

        if (! $recipientRecord) {
            return response()->json(['success' => false, 'message' => 'Message not found.'], 404);
        }

        $recipientRecord->update(['is_archived' => true]);

        return response()->json(['success' => true, 'message' => 'Message archived.']);
    }

    // ==================== NOTICES ====================

    public function indexNotices(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $query = Message::query()
            ->where('organization_id', $organization->id)
            ->where('is_announcement', true)
            ->with(['sender:id,name,role'])
            ->orderByDesc('priority')
            ->latest();

        $notices = $query->limit(200)->get()->map(function (Message $message) {
            $noticeMeta = is_array($message->attachments['notice_board'] ?? null)
                ? $message->attachments['notice_board']
                : [];

            return [
                'id' => (string) $message->id,
                'title' => $message->subject,
                'description' => $message->message,
                'publishedOn' => optional($message->created_at)->format('Y-m-d'),
                'priority' => $message->priority === 'high' ? 'high' : 'medium',
                'pinned' => $message->priority === 'high',
                'createdBy' => $message->sender?->name ?? 'School Admin',
                'audience' => $noticeMeta['audience_label'] ?? 'All',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $notices,
        ]);
    }

    public function showNotice(Request $request, int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $notice = Message::query()
            ->where('organization_id', $organization->id)
            ->where('is_announcement', true)
            ->with(['sender:id,name,role'])
            ->find($id);

        if (! $notice) {
            return response()->json(['success' => false, 'message' => 'Notice not found.'], 404);
        }

        $noticeMeta = is_array($notice->attachments['notice_board'] ?? null)
            ? $notice->attachments['notice_board']
            : [];

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $notice->id,
                'title' => $notice->subject,
                'description' => $notice->message,
                'publishedOn' => optional($notice->created_at)->format('Y-m-d'),
                'priority' => $notice->priority === 'high' ? 'high' : 'medium',
                'pinned' => $notice->priority === 'high',
                'createdBy' => $notice->sender?->name ?? 'School Admin',
                'audienceType' => $noticeMeta['audience_type'] ?? 'both',
                'selectedGroups' => $noticeMeta['selected_groups'] ?? [],
                'audience' => $noticeMeta['audience_label'] ?? 'All',
            ],
        ]);
    }

    public function storeNotice(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || ! $this->canManageNotices($user)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'audienceType' => ['required', Rule::in(['students', 'staff', 'both', 'class_section'])],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'pinned' => ['boolean'],
        ]);

        [$recipients, $recipientSummary] = $this->resolveNoticeRecipients(
            $organization,
            $validated['audienceType'],
            $validated['selectedGroups'] ?? [],
        );

        $noticeMeta = [
            'notice_board' => [
                'audience_type' => $validated['audienceType'],
                'audience_label' => $recipientSummary ?: 'All',
                'selected_groups' => $validated['selectedGroups'] ?? [],
            ],
        ];

        $message = Message::create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => $validated['title'],
            'message' => $validated['description'],
            'priority' => ($validated['pinned'] ?? false) ? 'high' : 'normal',
            'is_announcement' => true,
            'attachments' => $noticeMeta,
        ]);

        if ($recipients->isNotEmpty()) {
            $recipientIds = $recipients->pluck('id')->unique()->values();
            foreach ($recipientIds as $recipientId) {
                MessageRecipient::create([
                    'message_id' => $message->id,
                    'recipient_id' => $recipientId,
                    'is_read' => false,
                    'is_starred' => false,
                    'is_archived' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Notice published successfully.',
            'data' => ['id' => (string) $message->id],
        ], 201);
    }

    public function updateNotice(Request $request, int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || ! $this->canManageNotices($user)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $notice = Message::query()
            ->where('organization_id', $organization->id)
            ->where('is_announcement', true)
            ->find($id);

        if (! $notice) {
            return response()->json(['success' => false, 'message' => 'Notice not found.'], 404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'max:5000'],
            'audienceType' => ['sometimes', Rule::in(['students', 'staff', 'both', 'class_section'])],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
            'pinned' => ['boolean'],
        ]);

        $notice->update([
            'subject' => $validated['title'] ?? $notice->subject,
            'message' => $validated['description'] ?? $notice->message,
            'priority' => isset($validated['pinned']) ? ($validated['pinned'] ? 'high' : 'normal') : $notice->priority,
        ]);

        if (isset($validated['audienceType'])) {
            [$recipients, $recipientSummary] = $this->resolveNoticeRecipients(
                $organization,
                $validated['audienceType'],
                $validated['selectedGroups'] ?? [],
            );

            $noticeMeta = [
                'notice_board' => [
                    'audience_type' => $validated['audienceType'],
                    'audience_label' => $recipientSummary ?: 'All',
                    'selected_groups' => $validated['selectedGroups'] ?? [],
                ],
            ];

            $notice->update(['attachments' => $noticeMeta]);

            MessageRecipient::query()->where('message_id', $notice->id)->delete();
            if ($recipients->isNotEmpty()) {
                foreach ($recipients->pluck('id')->unique() as $recipientId) {
                    MessageRecipient::create([
                        'message_id' => $notice->id,
                        'recipient_id' => $recipientId,
                        'is_read' => false,
                        'is_starred' => false,
                        'is_archived' => false,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Notice updated successfully.',
            'data' => ['id' => (string) $notice->id],
        ]);
    }

    public function destroyNotice(int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || ! $this->canManageNotices($user)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $notice = Message::query()
            ->where('organization_id', $organization->id)
            ->where('is_announcement', true)
            ->find($id);

        if (! $notice) {
            return response()->json(['success' => false, 'message' => 'Notice not found.'], 404);
        }

        $notice->delete();

        return response()->json(['success' => true, 'message' => 'Notice deleted successfully.']);
    }

    // ==================== VOICE CALLS ====================

    public function indexVoiceCalls(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $query = VoiceCallLog::query()
            ->where('organization_id', $organization->id)
            ->with(['sender:id,name,role'])
            ->latest();

        $calls = $query->limit(200)->get()->map(function (VoiceCallLog $call) {
            return [
                'id' => (string) $call->id,
                'subject' => $call->subject,
                'content' => $call->content,
                'audienceType' => $call->audience_type,
                'recipientSummary' => $call->recipient_summary,
                'recipientCount' => (int) $call->recipient_count,
                'status' => $call->status,
                'scheduledFor' => optional($call->scheduled_for)->format('Y-m-d H:i:s'),
                'sentAt' => optional($call->sent_at)->format('Y-m-d H:i:s'),
                'providerName' => $call->provider_name,
                'errorMessage' => $call->error_message,
                'sender' => $call->sender?->name ?? 'Unknown',
                'createdAt' => optional($call->created_at)->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $calls,
            'hasVoiceConfigured' => $this->hasSmartfloVoiceConfiguration($organization),
        ]);
    }

    public function storeVoiceCall(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        if (! $this->hasSmartfloVoiceConfiguration($organization)) {
            return response()->json(['success' => false, 'message' => 'Voice calls are not configured for this organization.'], 400);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:2000'],
            'audienceType' => ['required', Rule::in(['students', 'staff', 'class_section', 'individual_staff', 'individual_students'])],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
        ]);

        [$phones, $recipientSummary] = $this->resolveVoiceRecipients(
            $organization,
            $validated['audienceType'],
            $validated['selectedGroups'] ?? [],
        );

        if ($phones->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No valid phone numbers found.'], 422);
        }

        $voiceSettings = $this->smartfloVoiceSettings($organization);

        $log = VoiceCallLog::create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'audience_type' => $validated['audienceType'],
            'recipient_summary' => $recipientSummary,
            'recipient_count' => $phones->count(),
            'recipient_phones' => $phones->values()->all(),
            'subject' => $validated['subject'],
            'content' => $validated['content'],
            'status' => 'initiated',
            'provider_name' => 'Smartflo',
        ]);

        $results = [];
        $successCount = 0;
        $failureCount = 0;

        foreach ($phones as $phone) {
            $payload = [
                'customer_number' => $phone,
                'caller_id' => $voiceSettings['callerId'],
                'api_key' => $voiceSettings['apiKey'],
                'customer_ring_timeout' => $voiceSettings['ringTimeout'] ?? 30,
                'call_timeout' => $voiceSettings['callTimeout'] ?? 60,
                'custom_identifier' => "Gurukul-{$log->id}",
            ];

            $response = $this->smartfloService->initiateClickToCallSupport($payload);

            if ($response['success']) {
                $successCount++;
            } else {
                $failureCount++;
            }

            $results[] = [
                'phone' => $phone,
                'success' => $response['success'],
                'message' => $response['message'],
            ];
        }

        $log->update([
            'status' => $failureCount === 0 ? 'completed' : ($successCount > 0 ? 'partial' : 'failed'),
            'sent_at' => now(),
            'provider_reference' => $results[0]['message'] ?? null,
            'provider_response' => $results,
            'error_message' => $failureCount > 0 ? "{$failureCount} calls failed" : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Voice calls initiated: {$successCount} succeeded, {$failureCount} failed.",
            'data' => [
                'id' => (string) $log->id,
                'successCount' => $successCount,
                'failureCount' => $failureCount,
                'results' => $results,
            ],
        ], 201);
    }

    public function cancelVoiceCall(int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $callLog = VoiceCallLog::query()
            ->where('organization_id', $organization->id)
            ->find($id);

        if (! $callLog) {
            return response()->json(['success' => false, 'message' => 'Voice call log not found.'], 404);
        }

        if (! in_array($callLog->status, ['initiated', 'scheduled'], true)) {
            return response()->json(['success' => false, 'message' => 'Cannot cancel a call that is already processed.'], 400);
        }

        $callLog->update(['status' => 'cancelled']);

        return response()->json(['success' => true, 'message' => 'Voice call cancelled.']);
    }

    // ==================== EMAILS ====================

    public function indexEmails(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $query = EmailLog::query()
            ->where('organization_id', $organization->id)
            ->with(['sender:id,name,role'])
            ->latest();

        $emails = $query->limit(200)->get()->map(function (EmailLog $emailLog) {
            return [
                'id' => (string) $emailLog->id,
                'subject' => $emailLog->subject,
                'content' => $emailLog->content,
                'audienceType' => $emailLog->audience_type,
                'recipientSummary' => $emailLog->recipient_summary,
                'recipientCount' => (int) $emailLog->recipient_count,
                'status' => $emailLog->status,
                'sentAt' => optional($emailLog->sent_at)->format('Y-m-d H:i:s'),
                'errorMessage' => $emailLog->error_message,
                'sender' => $emailLog->sender?->name ?? 'Unknown',
                'createdAt' => optional($emailLog->created_at)->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $emails,
        ]);
    }

    public function sendEmail(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:10000'],
            'audienceType' => ['required', Rule::in(['staff', 'students', 'class_section', 'individual_staff', 'individual_students'])],
            'selectedGroups' => ['nullable', 'array'],
            'selectedGroups.*' => ['string'],
        ]);

        [$recipients, $recipientSummary] = $this->resolveEmailRecipients(
            $organization,
            $validated['audienceType'],
            $validated['selectedGroups'] ?? [],
        );

        if ($recipients->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No valid email recipients found.'], 422);
        }

        $mailConfigured = $this->configureOutgoingMail();

        $log = EmailLog::create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'audience_type' => $validated['audienceType'],
            'recipient_summary' => $recipientSummary,
            'recipient_count' => $recipients->count(),
            'recipient_emails' => $recipients->pluck('email')->values()->all(),
            'subject' => $validated['subject'],
            'content' => $validated['content'],
            'status' => $mailConfigured ? 'sending' : 'failed',
            'error_message' => $mailConfigured ? null : 'Mail not configured at super-admin level.',
        ]);

        if (! $mailConfigured) {
            return response()->json([
                'success' => false,
                'message' => 'Mail is not configured. Please configure SMTP settings.',
                'data' => ['id' => (string) $log->id],
            ], 500);
        }

        $successCount = 0;
        $failureCount = 0;
        $errors = [];

        foreach ($recipients as $recipient) {
            try {
                Mail::raw($validated['content'], function ($mail) use ($recipient, $validated) {
                    $mail->to($recipient['email'])
                        ->subject($validated['subject']);
                });
                $successCount++;
            } catch (\Exception $e) {
                $failureCount++;
                $errors[] = $e->getMessage();
            }
        }

        $log->update([
            'status' => $failureCount === 0 ? 'sent' : ($successCount > 0 ? 'partial' : 'failed'),
            'sent_at' => now(),
            'error_message' => $failureCount > 0 ? implode('; ', array_slice($errors, 0, 3)) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Emails sent: {$successCount} succeeded, {$failureCount} failed.",
            'data' => [
                'id' => (string) $log->id,
                'successCount' => $successCount,
                'failureCount' => $failureCount,
            ],
        ], 201);
    }

    public function destroyEmail(int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $emailLog = EmailLog::query()
            ->where('organization_id', $organization->id)
            ->find($id);

        if (! $emailLog) {
            return response()->json(['success' => false, 'message' => 'Email log not found.'], 404);
        }

        $emailLog->delete();

        return response()->json(['success' => true, 'message' => 'Email log deleted.']);
    }

    // ==================== DOWNLOAD CENTER ====================

    public function indexDownloadCenter(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $query = DownloadCenterShare::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->with(['media.uploader'])
            ->latest('shared_on')
            ->latest('id');

        if (! $this->canManageDownloadCenter($user)) {
            $query->whereIn('audience', in_array($user->role, ['student', 'parent'], true) ? ['students', 'both'] : ['staff', 'both']);
        }

        $items = $query->get()->filter(fn (DownloadCenterShare $share) => $share->media !== null)->map(function (DownloadCenterShare $share) {
            $media = $share->media;

            return [
                'id' => (string) $share->id,
                'mediaId' => (string) $media->id,
                'title' => $media->title,
                'contentType' => $media->media_type,
                'category' => $media->category,
                'audience' => $share->audience,
                'shareGroup' => $share->share_group,
                'format' => $media->format ?: 'FILE',
                'sharedOn' => optional($share->shared_on)->format('Y-m-d') ?: optional($share->created_at)->format('Y-m-d'),
                'downloads' => (int) $share->downloads_count,
                'uploader' => $media->uploader?->name ?? 'School Admin',
                'size' => $media->source_kind === 'youtube' ? 'YouTube Link' : $this->formatBytes((int) $media->file_size),
                'description' => $media->description ?? '',
                'duration' => $media->duration,
                'fileName' => $media->file_name,
                'sourceKind' => $media->source_kind,
                'youtubeUrl' => $media->youtube_url,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $items,
            'canManage' => $this->canManageDownloadCenter($user),
        ]);
    }

    public function uploadDownloadCenterMedia(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || ! $this->canManageDownloadCenter($user)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'mediaType' => ['required', Rule::in(['document', 'video', 'audio', 'image', 'other'])],
            'sourceKind' => ['required', Rule::in(['local', 'youtube'])],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'file' => ['required_if:sourceKind,local', 'file', 'max:10240'],
            'youtubeUrl' => ['required_if:sourceKind,youtube', 'url'],
        ]);

        if ($validated['sourceKind'] === 'youtube') {
            $media = DownloadCenterMedia::create([
                'organization_id' => $organization->id,
                'uploaded_by_user_id' => $user->id,
                'title' => $validated['title'],
                'media_type' => $validated['mediaType'],
                'source_kind' => 'youtube',
                'category' => $validated['category'],
                'format' => 'VIDEO',
                'youtube_url' => $validated['youtubeUrl'],
                'description' => $validated['description'],
                'is_active' => true,
            ]);
        } else {
            $file = $request->file('file');
            $path = $file->store('download-center');

            $media = DownloadCenterMedia::create([
                'organization_id' => $organization->id,
                'uploaded_by_user_id' => $user->id,
                'title' => $validated['title'],
                'media_type' => $validated['mediaType'],
                'source_kind' => 'local',
                'category' => $validated['category'],
                'format' => strtoupper($file->getClientOriginalExtension()),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'description' => $validated['description'],
                'is_active' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Media uploaded successfully.',
            'data' => ['id' => (string) $media->id],
        ], 201);
    }

    public function shareDownloadCenterMedia(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || ! $this->canManageDownloadCenter($user)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $validated = $request->validate([
            'mediaId' => ['required', 'integer'],
            'audience' => ['required', Rule::in(['staff', 'students', 'both'])],
            'shareGroup' => ['nullable', 'string', 'max:255'],
        ]);

        $media = DownloadCenterMedia::query()
            ->where('organization_id', $organization->id)
            ->find($validated['mediaId']);

        if (! $media) {
            return response()->json(['success' => false, 'message' => 'Media not found.'], 404);
        }

        $share = DownloadCenterShare::create([
            'organization_id' => $organization->id,
            'download_center_media_id' => $media->id,
            'audience' => $validated['audience'],
            'share_group' => $validated['shareGroup'],
            'is_active' => true,
            'shared_on' => now(),
            'shared_by_user_id' => $user->id,
            'downloads_count' => 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Media shared successfully.',
            'data' => ['id' => (string) $share->id],
        ], 201);
    }

    public function downloadDownloadCenterContent(DownloadCenterShare $share)
    {
        $user = Auth::user();

        if (! $this->canAccessDownloadCenterShare($user, $share)) {
            return response()->json(['success' => false, 'message' => 'Access denied.'], 403);
        }

        $media = $share->media;

        if (! $media || $media->source_kind !== 'local') {
            return response()->json(['success' => false, 'message' => 'File not available for download.'], 404);
        }

        if (! Storage::exists($media->file_path)) {
            return response()->json(['success' => false, 'message' => 'File not found.'], 404);
        }

        $share->increment('downloads_count');

        return Storage::download($media->file_path, $media->file_name);
    }

    public function deleteDownloadCenterShare(int $id)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization || ! $this->canManageDownloadCenter($user)) {
            return response()->json(['success' => false, 'message' => 'Permission denied.'], 403);
        }

        $share = DownloadCenterShare::query()
            ->where('organization_id', $organization->id)
            ->find($id);

        if (! $share) {
            return response()->json(['success' => false, 'message' => 'Share not found.'], 404);
        }

        $share->delete();

        return response()->json(['success' => true, 'message' => 'Share deleted.']);
    }

    // ==================== AUDIENCE OPTIONS ====================

    public function getAudienceOptions(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $staffRoles = collect([
            ['id' => 'principal', 'label' => 'Principal'],
            ['id' => 'admin', 'label' => 'Admin'],
            ['id' => 'teacher', 'label' => 'Teacher'],
            ['id' => 'accountant', 'label' => 'Accountant'],
            ['id' => 'librarian', 'label' => 'Librarian'],
            ['id' => 'receptionist', 'label' => 'Receptionist'],
            ['id' => 'security', 'label' => 'Security'],
        ]);

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => sprintf('%s-%s', $schoolClass->name, $schoolClass->section),
                'label' => sprintf('Class %s - Section %s', $schoolClass->name, $schoolClass->section),
            ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->select('id', 'first_name', 'last_name', 'admission_no')
            ->orderBy('first_name')
            ->limit(500)
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'label' => trim($student->first_name . ' ' . $student->last_name) . ' (' . $student->admission_no . ')',
            ]);

        $staff = User::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereNotIn('role', ['student', 'parent'])
            ->select('id', 'name', 'role')
            ->orderBy('name')
            ->limit(500)
            ->get()
            ->map(fn (User $u) => [
                'id' => (string) $u->id,
                'label' => $u->name . ' (' . ucfirst($u->role) . ')',
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'staffRoles' => $staffRoles,
                'classes' => $classes,
                'students' => $students,
                'staff' => $staff,
            ],
        ]);
    }

    // ==================== PRIVATE HELPERS ====================

    private function resolveMessageRecipients(Organization $organization, string $audienceType, array $groups): array
    {
        match ($audienceType) {
            'staff' => $result = $this->resolveStaffRecipients($organization, $groups),
            'students' => $result = $this->resolveAllStudentRecipients($organization),
            'class_section' => $result = $this->resolveClassSectionRecipientsForMessaging($organization, $groups),
            'individual_staff' => $result = $this->resolveIndividualStaffRecipients($organization, $groups),
            'individual_students' => $result = $this->resolveIndividualStudentRecipients($organization, $groups),
        };

        return $result;
    }

    private function resolveStaffRecipients(Organization $organization, array $groups): array
    {
        $query = User::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereNotIn('role', ['student', 'parent']);

        $selectedRoles = collect($groups)->filter()->values();

        if ($selectedRoles->isNotEmpty()) {
            $query->whereIn('role', $selectedRoles);
        }

        $users = $query->get();

        return [
            $users->map(fn (User $user) => ['id' => $user->id, 'email' => $user->email, 'name' => $user->name]),
            $users->pluck('name')->implode(', '),
        ];
    }

    private function resolveAllStudentRecipients(Organization $organization): array
    {
        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->get();

        $recipients = $students
            ->filter(fn (Student $s) => filled($s->user_id))
            ->map(fn (Student $s) => ['id' => $s->user_id, 'email' => $s->email, 'name' => trim($s->first_name . ' ' . $s->last_name)]);

        return [$recipients, 'All Students'];
    }

    private function resolveClassSectionRecipientsForMessaging(Organization $organization, array $groups): array
    {
        $selectedGroups = collect($groups)->filter()->values();

        if ($selectedGroups->isEmpty()) {
            return [collect(), ''];
        }

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->get()
            ->filter(function (Student $student) use ($selectedGroups) {
                $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);
                return $selectedGroups->contains($groupKey);
            });

        $recipients = $students
            ->filter(fn (Student $s) => filled($s->user_id))
            ->map(fn (Student $s) => ['id' => $s->user_id, 'email' => $s->email, 'name' => trim($s->first_name . ' ' . $s->last_name)]);

        return [$recipients, 'Students of ' . $selectedGroups->implode(', ')];
    }

    private function resolveIndividualStaffRecipients(Organization $organization, array $ids): array
    {
        $users = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', collect($ids)->filter()->map(fn ($id) => (int) $id)->all())
            ->get();

        return [
            $users->map(fn (User $u) => ['id' => $u->id, 'email' => $u->email, 'name' => $u->name]),
            $users->pluck('name')->implode(', '),
        ];
    }

    private function resolveIndividualStudentRecipients(Organization $organization, array $ids): array
    {
        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', collect($ids)->filter()->map(fn ($id) => (int) $id)->all())
            ->get();

        return [
            $students
                ->filter(fn (Student $s) => filled($s->user_id))
                ->map(fn (Student $s) => ['id' => $s->user_id, 'email' => $s->email, 'name' => trim($s->first_name . ' ' . $s->last_name)]),
            $students->map(fn (Student $s) => trim($s->first_name . ' ' . $s->last_name))->implode(', '),
        ];
    }

    private function dispatchPushNotificationForMessage(Message $message, array $recipientIds, bool $sendNotification, string $recipientSummary): array
    {
        if (! $sendNotification) {
            return [
                'attempted' => false,
                'configured' => $this->firebaseCloudMessagingService->isConfigured(),
                'attemptedCount' => 0,
                'successCount' => 0,
                'failureCount' => 0,
            ];
        }

        $result = $this->firebaseCloudMessagingService->sendToUsers(
            $recipientIds,
            $message->subject,
            Str::limit(trim(preg_replace('/\s+/', ' ', $message->message) ?? ''), 160),
            [
                'type' => 'message',
                'message_id' => (string) $message->id,
                'organization_id' => (string) $message->organization_id,
                'priority' => (string) ($message->priority ?? 'normal'),
                'is_announcement' => $message->is_announcement ? '1' : '0',
            ],
        );

        $attachments = $message->attachments ?? [];
        $attachments['push_notification'] = [
            'attempted' => true,
            'recipient_summary' => $recipientSummary,
            'attempted_count' => $result['attemptedCount'],
            'success_count' => $result['successCount'],
            'failure_count' => $result['failureCount'],
            'configured' => $result['configured'],
            'sent_at' => now()->toIso8601String(),
        ];
        $message->update(['attachments' => $attachments]);

        return array_merge(['attempted' => true], $result);
    }

    private function resolveNoticeRecipients(Organization $organization, string $audienceType, array $groups): array
    {
        if ($audienceType === 'both') {
            $staff = User::query()
                ->where('organization_id', $organization->id)
                ->where('is_active', true)
                ->whereNotIn('role', ['student', 'parent'])
                ->get();

            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->get();

            $combined = collect();
            foreach ($staff as $user) {
                $combined->push(['id' => $user->id]);
            }
            foreach ($students as $student) {
                $combined->push(['id' => $student->id]);
            }

            return [$combined, 'All Staff & Students'];
        }

        if ($audienceType === 'staff') {
            $staff = User::query()
                ->where('organization_id', $organization->id)
                ->where('is_active', true)
                ->whereNotIn('role', ['student', 'parent'])
                ->get();

            return [$staff->map(fn (User $u) => ['id' => $u->id]), 'All Staff'];
        }

        if ($audienceType === 'students') {
            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->get();

            return [$students->map(fn (Student $s) => ['id' => $s->id]), 'All Students'];
        }

        if ($audienceType === 'class_section') {
            $selectedGroups = collect($groups)->filter()->values();

            if ($selectedGroups->isEmpty()) {
                return [collect(), ''];
            }

            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->get()
                ->filter(function (Student $student) use ($selectedGroups) {
                    $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);
                    return $selectedGroups->contains($groupKey);
                });

            return [$students->map(fn (Student $s) => ['id' => $s->id]), 'Students of ' . $selectedGroups->implode(', ')];
        }

        return [collect(), ''];
    }

    private function resolveVoiceRecipients(Organization $organization, string $audienceType, array $groups): array
    {
        if ($audienceType === 'students') {
            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->get();

            $phones = $students
                ->map(fn (Student $s) => $this->resolveStudentVoicePhone($s))
                ->filter();

            return [$phones, 'All Students'];
        }

        if ($audienceType === 'staff') {
            $staff = User::query()
                ->where('organization_id', $organization->id)
                ->where('is_active', true)
                ->whereNotIn('role', ['student', 'parent'])
                ->get();

            $phones = $staff
                ->map(fn (User $u) => $this->normalizePhoneNumber($u->phone))
                ->filter();

            return [$phones, 'All Staff'];
        }

        if ($audienceType === 'class_section') {
            $selectedGroups = collect($groups)->filter()->values();

            if ($selectedGroups->isEmpty()) {
                return [collect(), ''];
            }

            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->get()
                ->filter(function (Student $student) use ($selectedGroups) {
                    $groupKey = sprintf('%s-%s', $student->schoolClass?->name, $student->schoolClass?->section);
                    return $selectedGroups->contains($groupKey);
                });

            $phones = $students
                ->map(fn (Student $s) => $this->resolveStudentVoicePhone($s))
                ->filter();

            return [$phones, 'Students of ' . $selectedGroups->implode(', ')];
        }

        if ($audienceType === 'individual_staff') {
            $staff = User::query()
                ->where('organization_id', $organization->id)
                ->whereIn('id', collect($groups)->filter()->map(fn ($id) => (int) $id)->all())
                ->get();

            $phones = $staff
                ->map(fn (User $u) => $this->normalizePhoneNumber($u->phone))
                ->filter();

            return [$phones, $staff->pluck('name')->implode(', ')];
        }

        if ($audienceType === 'individual_students') {
            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->whereIn('id', collect($groups)->filter()->map(fn ($id) => (int) $id)->all())
                ->get();

            $phones = $students
                ->map(fn (Student $s) => $this->resolveStudentVoicePhone($s))
                ->filter();

            return [$phones, $students->map(fn (Student $s) => trim($s->first_name . ' ' . $s->last_name))->implode(', ')];
        }

        return [collect(), ''];
    }

    private function resolveEmailRecipients(Organization $organization, string $audienceType, array $groups): array
    {
        match ($audienceType) {
            'staff' => $result = $this->resolveStaffRecipients($organization, $groups),
            'students' => $result = $this->resolveAllStudentRecipients($organization),
            'class_section' => $result = $this->resolveClassSectionRecipientsForMessaging($organization, $groups),
            'individual_staff' => $result = $this->resolveIndividualStaffRecipients($organization, $groups),
            'individual_students' => $result = $this->resolveIndividualStudentRecipients($organization, $groups),
        };

        return $result;
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
            $normalized = $this->normalizePhoneNumber($phone);
            if ($normalized) {
                return $normalized;
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
        $length = strlen($digits);

        if ($length < 10 || $length > 15) {
            return null;
        }

        return $digits;
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

    private function canManageDownloadCenter(?User $user): bool
    {
        return $user !== null && ! in_array($user->role, ['student', 'parent'], true);
    }

    private function canAccessDownloadCenterShare(?User $user, DownloadCenterShare $share): bool
    {
        if (! $user || $share->organization_id !== $user->organization_id) {
            return false;
        }

        if ($this->canManageDownloadCenter($user)) {
            return true;
        }

        return in_array($share->audience, ['students', 'both'], true);
    }

    private function smartfloVoiceSettings(Organization $organization): array
    {
        $defaults = [
            'enabled' => false,
            'provider' => 'Smartflo',
            'apiKey' => '',
            'callerId' => '',
            'ringTimeout' => 30,
            'callTimeout' => 60,
        ];

        return array_replace_recursive($defaults, $organization->settings['communication_settings']['voice'] ?? []);
    }

    private function hasSmartfloVoiceConfiguration(Organization $organization): bool
    {
        $settings = $this->smartfloVoiceSettings($organization);

        return (bool) ($settings['enabled'] ?? false)
            && filled($settings['apiKey'] ?? null)
            && filled($settings['callerId'] ?? null);
    }

    private function configureOutgoingMail(): bool
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('super_admin_settings')) {
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

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return number_format($bytes / (1024 * 1024), 1) . ' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024) . ' KB';
        }

        return $bytes . ' bytes';
    }

    private function resolveOrganizationForUser($user): ?Organization
    {
        return $this->staffPermissionService->resolveOrganizationForUser($user);
    }
}
