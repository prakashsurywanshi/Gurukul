<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\Organization;
use App\Services\QwaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SendQwaWhatsappMessageJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 90;

    public function __construct(
        private readonly int $messageId,
        private readonly int $organizationId,
        private readonly int $recipientIndex,
        private readonly string $recipientName,
        private readonly string $phone,
        private readonly string $messageText,
        private readonly string $messageType = 'text',
        private readonly ?string $mediaPath = null,
        private readonly ?string $mediaMimeType = null,
        private readonly ?string $mediaFilename = null,
        private readonly ?string $mediaCaption = null,
        private readonly ?string $templateQwaId = null,
        private readonly ?string $templateMode = null,
        private readonly array $templateVars = [],
    ) {}

    public function handle(QwaService $qwaService): void
    {
        $this->markRecipient('processing');

        $organization = Organization::query()->find($this->organizationId);

        if (! $organization) {
            $this->recordResult([
                'success' => false,
                'statusCode' => 500,
                'body' => null,
                'message' => 'Organization record was not found.',
            ], null);

            return;
        }

        $settings = $this->qwaSettings($organization);

        if (empty($settings['baseUrl']) || empty($settings['apiKey']) || empty($settings['sessionId'])) {
            $this->recordResult([
                'success' => false,
                'statusCode' => 400,
                'body' => null,
                'message' => 'QWA is not configured. Set up the QWA gateway in Communication Settings first.',
            ], $settings['sessionId'] ?? null);

            return;
        }

        $chatId = $this->phone.'@c.us';

        try {
            $result = $this->templateMode === 'native' && filled($this->templateQwaId)
                ? $qwaService->sendTemplate(
                    $settings['baseUrl'],
                    $settings['apiKey'],
                    $settings['sessionId'],
                    $chatId,
                    $this->templateQwaId,
                    $this->templateVars,
                )
                : ($this->messageType === 'text'
                    ? $qwaService->sendTextMessage(
                        $settings['baseUrl'],
                        $settings['apiKey'],
                        $settings['sessionId'],
                        $chatId,
                        $this->messageText
                    )
                    : $this->sendMedia($qwaService, $settings, $chatId));
        } catch (Throwable $exception) {
            $result = [
                'success' => false,
                'statusCode' => 500,
                'body' => null,
                'message' => $exception->getMessage(),
            ];
        }

        $this->recordResult($result, $settings['sessionId']);
    }

    private function sendMedia(QwaService $qwaService, array $settings, string $chatId): array
    {
        $contents = filled($this->mediaPath) ? Storage::disk('public')->get($this->mediaPath) : null;

        if ($contents === null) {
            return [
                'success' => false,
                'statusCode' => 400,
                'body' => null,
                'message' => 'The uploaded media file could not be read.',
            ];
        }

        $mediaType = $this->messageType === 'photo' ? 'image' : $this->messageType;
        $payload = [
            'chatId' => $chatId,
            'base64' => base64_encode($contents),
            'mimetype' => (string) ($this->mediaMimeType ?: 'application/octet-stream'),
            'filename' => (string) ($this->mediaFilename ?: 'file'),
        ];

        if (filled($this->mediaCaption)) {
            $payload['caption'] = $this->mediaCaption;
        }

        if ($mediaType === 'audio' && str_starts_with((string) $this->mediaMimeType, 'audio/ogg')) {
            $payload['ptt'] = true;
        }

        return $qwaService->sendMedia($mediaType, $settings['baseUrl'], $settings['apiKey'], $settings['sessionId'], $payload);
    }

    private function markRecipient(string $status): void
    {
        $message = Message::query()->find($this->messageId);

        if (! $message) {
            return;
        }

        $meta = $this->qwaMeta($message->attachments ?? []);
        $recipients = $this->recipients($meta);

        $recipients[$this->recipientIndex] = array_replace($recipients[$this->recipientIndex] ?? [], [
            'name' => $this->recipientName,
            'phone' => $this->phone,
            'status' => $status,
            'scheduled_at' => $recipients[$this->recipientIndex]['scheduled_at'] ?? Carbon::now()->toDateTimeString(),
            'sent_at' => null,
            'failed_reason' => null,
        ]);

        $meta['status'] = 'processing';
        $meta['recipients'] = $recipients;

        $message->forceFill(['attachments' => $this->storeMeta($message->attachments ?? [], $meta)])->save();
    }

    private function recordResult(array $result, ?string $sessionId): void
    {
        $message = Message::query()->find($this->messageId);

        if (! $message) {
            return;
        }

        $meta = $this->qwaMeta($message->attachments ?? []);
        $recipients = $this->recipients($meta);
        $now = Carbon::now()->toDateTimeString();
        $success = (bool) ($result['success'] ?? false);

        $recipients[$this->recipientIndex] = array_replace($recipients[$this->recipientIndex] ?? [], [
            'name' => $this->recipientName,
            'phone' => $this->phone,
            'status' => $success ? 'sent' : 'failed',
            'scheduled_at' => $recipients[$this->recipientIndex]['scheduled_at'] ?? $now,
            'sent_at' => $success ? $now : null,
            'failed_reason' => $success ? null : ($result['message'] ?? 'QWA message delivery failed.'),
        ]);

        $responses = collect($meta['responses'] ?? [])
            ->reject(fn (array $response) => (int) ($response['recipient_index'] ?? -1) === $this->recipientIndex)
            ->push([
                'recipient_index' => $this->recipientIndex,
                'phone' => $this->phone,
                'name' => $this->recipientName,
                'sent_at' => $now,
                ...$result,
            ])
            ->values()
            ->all();

        $successfulCount = collect($recipients)->where('status', 'sent')->count();
        $failedCount = collect($recipients)->where('status', 'failed')->count();
        $pendingCount = collect($recipients)->whereIn('status', ['pending', 'processing'])->count();

        $meta['session_id'] = $sessionId;
        $meta['responses'] = $responses;
        $meta['recipients'] = $recipients;
        $meta['successful_count'] = $successfulCount;
        $meta['failed_count'] = $failedCount;
        $meta['pending_count'] = $pendingCount;
        $meta['status'] = match (true) {
            $pendingCount > 0 => 'processing',
            $successfulCount > 0 && $failedCount > 0 => 'partial',
            $successfulCount > 0 => 'sent',
            default => 'failed',
        };

        $message->forceFill(['attachments' => $this->storeMeta($message->attachments ?? [], $meta)])->save();
    }

    private function qwaSettings(Organization $organization): array
    {
        $qwa = $organization->settings['communication_settings']['qwa'] ?? [];

        if (filled($qwa['apiKey'] ?? '')) {
            try {
                $qwa['apiKey'] = Crypt::decryptString($qwa['apiKey']);
            } catch (Throwable) {
                // Keep the legacy plaintext value.
            }
        }

        return $qwa;
    }

    private function qwaMeta(array $attachments): array
    {
        return is_array($attachments['qwa_whatsapp'] ?? null) ? $attachments['qwa_whatsapp'] : [];
    }

    private function storeMeta(array $attachments, array $meta): array
    {
        $attachments['channel'] = 'qwa_whatsapp';
        $attachments['qwa_whatsapp'] = $meta;

        return $attachments;
    }

    private function recipients(array $meta): array
    {
        return collect($meta['recipients'] ?? [])->values()->all();
    }
}
