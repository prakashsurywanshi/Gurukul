<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Models\SmsLog;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Throwable;

class SendSmsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 60;

    public function __construct(
        private readonly int $smsLogId,
        private readonly int $organizationId,
        private readonly string $phone,
    ) {}

    public function handle(SmsService $smsService): void
    {
        $smsLog = SmsLog::query()->find($this->smsLogId);

        if (! $smsLog) {
            return;
        }

        $organization = Organization::query()->find($this->organizationId);

        if (! $organization) {
            return;
        }

        $this->markRecipient($smsLog, 'processing');

        $smsSettings = is_array($organization->settings['communication_settings']['sms'] ?? null)
            ? $organization->settings['communication_settings']['sms']
            : [];

        try {
            $result = $smsService->send($smsSettings, $this->phone, $smsLog->content);
        } catch (Throwable $exception) {
            $result = [
                'success' => false,
                'status' => 500,
                'body' => null,
                'message' => $exception->getMessage(),
                'reference' => null,
                'provider' => $smsSettings['provider'] ?? 'sms',
            ];
        }

        $this->recordResult($smsLog, $result);
    }

    private function markRecipient(SmsLog $smsLog, string $status): void
    {
        $details = $this->recipientDetails($smsLog);
        $details[$this->phone] = [
            'phone' => $this->phone,
            'status' => $status,
            'queued_at' => $details[$this->phone]['queued_at'] ?? (string) $smsLog->queued_at,
            'sent_at' => null,
            'failed_reason' => null,
        ];

        $smsLog->update([
            'recipient_details' => $details,
            'status' => 'processing',
        ]);
    }

    private function recordResult(SmsLog $smsLog, array $result): void
    {
        $now = Carbon::now()->toDateTimeString();
        $success = (bool) ($result['success'] ?? false);

        $details = $this->recipientDetails($smsLog);
        $details[$this->phone] = array_replace($details[$this->phone] ?? [], [
            'phone' => $this->phone,
            'status' => $success ? 'sent' : 'failed',
            'sent_at' => $success ? $now : null,
            'failed_reason' => $success ? null : ($result['message'] ?? 'SMS delivery failed.'),
            'provider' => $result['provider'] ?? null,
            'reference' => $result['reference'] ?? null,
        ]);

        $successfulCount = collect($details)->where('status', 'sent')->count();
        $failedCount = collect($details)->where('status', 'failed')->count();
        $pendingCount = collect($details)->whereIn('status', ['pending', 'processing', 'queued'])->count();

        $references = collect($details)
            ->pluck('reference')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $responses = collect($smsLog->provider_response ?? [])
            ->push([
                'phone' => $this->phone,
                'sent_at' => $now,
                ...$result,
            ])
            ->values()
            ->all();

        $smsLog->update([
            'recipient_details' => $details,
            'provider_response' => $responses,
            'provider_name' => $result['provider'] ?? $smsLog->provider_name,
            'provider_reference' => empty($references) ? $smsLog->provider_reference : implode(', ', $references),
            'sent_at' => $successfulCount > 0 ? $smsLog->sent_at ?? $now : $smsLog->sent_at,
            'status' => match (true) {
                $pendingCount > 0 => 'processing',
                $successfulCount > 0 && $failedCount > 0 => 'partial',
                $successfulCount > 0 => 'sent',
                default => 'failed',
            },
            'error_message' => match (true) {
                $pendingCount > 0 => $smsLog->error_message,
                $failedCount > 0 => collect($details)
                    ->where('status', 'failed')
                    ->pluck('failed_reason')
                    ->unique()
                    ->implode("\n"),
                default => null,
            },
        ]);
    }

    private function recipientDetails(SmsLog $smsLog): array
    {
        $details = $smsLog->recipient_details ?? [];

        if (empty($details)) {
            $details = collect($smsLog->recipient_phones ?? [])
                ->mapWithKeys(fn (string $phone) => [
                    $phone => [
                        'phone' => $phone,
                        'status' => 'queued',
                        'sent_at' => null,
                        'failed_reason' => null,
                    ],
                ])
                ->all();
        }

        return $details;
    }
}