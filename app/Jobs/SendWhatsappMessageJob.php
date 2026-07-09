<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\WhatsappBridgeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Throwable;

class SendWhatsappMessageJob implements ShouldQueue
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
        private readonly ?string $fallbackSession = null,
    ) {}

    public function handle(WhatsappBridgeService $whatsappBridgeService): void
    {
        $this->markRecipient('processing');

        $session = Cache::get($this->sessionCacheKey()) ?: $this->fallbackSession;

        try {
            $result = $whatsappBridgeService->send($session, $this->phone, $this->messageText);
        } catch (Throwable $exception) {
            $result = [
                'success' => false,
                'statusCode' => 500,
                'body' => null,
                'message' => $exception->getMessage(),
                'session' => $session,
                'account' => null,
                'status' => null,
            ];
        }

        $session = $result['session'] ?? $session;

        if (filled($session)) {
            Cache::forever($this->sessionCacheKey(), $session);
        }

        $this->recordResult($result, $session);
    }

    private function markRecipient(string $status): void
    {
        $message = Message::query()->find($this->messageId);

        if (! $message) {
            return;
        }

        $attachments = $message->attachments ?? [];
        $meta = $this->whatsappMeta($attachments);
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
        $attachments['whatsapp'] = $meta;

        $message->forceFill(['attachments' => $attachments])->save();
    }

    private function recordResult(array $result, ?string $session): void
    {
        $message = Message::query()->find($this->messageId);

        if (! $message) {
            return;
        }

        $attachments = $message->attachments ?? [];
        $meta = $this->whatsappMeta($attachments);
        $recipients = $this->recipients($meta);
        $now = Carbon::now()->toDateTimeString();
        $success = (bool) ($result['success'] ?? false);

        $recipients[$this->recipientIndex] = array_replace($recipients[$this->recipientIndex] ?? [], [
            'name' => $this->recipientName,
            'phone' => $this->phone,
            'status' => $success ? 'sent' : 'failed',
            'scheduled_at' => $recipients[$this->recipientIndex]['scheduled_at'] ?? $now,
            'sent_at' => $success ? $now : null,
            'failed_reason' => $success ? null : ($result['message'] ?? 'WhatsApp bridge request failed.'),
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

        $meta['bridge_session'] = $session;
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

        $attachments['whatsapp'] = $meta;

        $message->forceFill(['attachments' => $attachments])->save();
    }

    private function whatsappMeta(array $attachments): array
    {
        return is_array($attachments['whatsapp'] ?? null) ? $attachments['whatsapp'] : [];
    }

    private function recipients(array $meta): array
    {
        return collect($meta['recipients'] ?? [])->values()->all();
    }

    private function sessionCacheKey(): string
    {
        return 'whatsapp_bridge_session.organization_'.$this->organizationId;
    }
}
