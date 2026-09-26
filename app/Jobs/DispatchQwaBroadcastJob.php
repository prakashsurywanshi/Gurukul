<?php

namespace App\Jobs;

use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\Organization;
use App\Models\StudentFee;
use App\Services\QwaService;
use App\Services\TemplateRenderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class DispatchQwaBroadcastJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 90;

    public function __construct(
        private readonly int $broadcastId,
        private readonly int $recipientId,
    ) {
    }

    public function handle(QwaService $qwaService, TemplateRenderService $templateRenderService): void
    {
        $recipient = BroadcastRecipient::query()->find($this->recipientId);

        if (! $recipient) {
            return;
        }

        $broadcast = Broadcast::query()->find($this->broadcastId);

        if (! $broadcast) {
            $this->markFailed($recipient);

            return;
        }

        $organization = Organization::query()->find($broadcast->organization_id);

        if (! $organization) {
            $this->markFailed($recipient);

            return;
        }

        $settings = $this->qwaSettings($organization);

        if (empty($settings['baseUrl']) || empty($settings['apiKey']) || empty($settings['sessionId'])) {
            $this->markFailed($recipient);

            return;
        }

        $student = $recipient->student_id ? $recipient->student()->first() : null;

        $context = $templateRenderService->schoolAndStudentContext($organization, $student);

        $recipientName = (string) ($recipient->name ?? '');
        $context['recipient_name'] = $recipientName;
        $context['name'] = $recipientName;
        $context['parent_name'] = (string) ($context['guardian_name'] ?? '') ?: $recipientName;
        $context['date'] = now()->format('j M Y');

        if ($student) {
            if ($class = $student->schoolClass) {
                $context['class_teacher_name'] = (string) (optional($class->teacher)->name ?? '');
            }

            if (str_contains((string) $broadcast->message, '[student_overall_balance_due]')
                || str_contains((string) $broadcast->message, '[due_date]')) {
                $fees = StudentFee::query()
                    ->where('organization_id', $organization->id)
                    ->where('student_id', $student->id)
                    ->get();

                $context['student_overall_balance_due'] = number_format(
                    (float) $fees->sum(fn (StudentFee $fee) => max(0, (float) $fee->balance)),
                    2,
                );

                $dueDate = $fees->pluck('due_date')->filter()->min();
                $context['due_date'] = $dueDate ? $dueDate->format('j M Y') : '';
            }
        }

        $text = $this->substitute((string) $broadcast->message, $context);

        if (! filled($recipient->contact)) {
            $this->markFailed($recipient);

            return;
        }

        try {
            $result = $qwaService->sendTextMessage(
                $settings['baseUrl'],
                $settings['apiKey'],
                $settings['sessionId'],
                $recipient->contact.'@c.us',
                $text,
            );
        } catch (Throwable $exception) {
            $result = [
                'success' => false,
                'statusCode' => 500,
                'body' => null,
                'message' => $exception->getMessage(),
            ];
        }

        if ($result['success'] ?? false) {
            $recipient->forceFill(['status' => 'sent', 'sent_at' => now()])->save();
        } else {
            $this->markFailed($recipient);
        }

        $this->refreshBroadcastCounts($broadcast);
    }

    private function substitute(string $message, array $context): string
    {
        return preg_replace_callback(
            '/\[([a-z][a-z0-9_]*)\]/i',
            function (array $matches) use ($context) {
                $key = $matches[1];

                return array_key_exists($key, $context) ? (string) ($context[$key] ?? '') : $matches[0];
            },
            $message,
        ) ?? $message;
    }

    private function markFailed(BroadcastRecipient $recipient): void
    {
        $recipient->forceFill(['status' => 'failed', 'sent_at' => null])->save();

        if ($broadcast = $recipient->broadcast()->first()) {
            $this->refreshBroadcastCounts($broadcast);
        }
    }

    private function refreshBroadcastCounts(Broadcast $broadcast): void
    {
        $statuses = BroadcastRecipient::query()
            ->where('broadcast_id', $broadcast->id)
            ->pluck('status');

        $pending = $statuses->where('status', 'pending')->count();

        $sent = BroadcastRecipient::query()
            ->where('broadcast_id', $broadcast->id)
            ->whereIn('status', ['sent', 'delivered', 'opened'])
            ->get(['student_id', 'user_id'])
            ->map(fn (BroadcastRecipient $recipient) => $recipient->student_id ? 's'.$recipient->student_id : 'u'.$recipient->user_id)
            ->unique()
            ->count();

        $broadcast->forceFill([
            'sent_count' => $sent,
            'delivered_count' => $sent,
            'status' => match (true) {
                $pending > 0 => 'sending',
                $sent > 0 => 'sent',
                default => 'failed',
            },
        ])->save();
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
}