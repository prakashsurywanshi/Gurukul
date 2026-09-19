<?php

namespace App\Jobs;

use App\Services\AiAnalytics\AiAnalyticsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ScoreOrganization implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(public readonly int $organizationId)
    {
    }

    public function handle(AiAnalyticsService $service): void
    {
        try {
            $service->refreshOrganization($this->organizationId);
        } catch (Throwable) {
            // A failed background score run should not break the queue worker.
        }
    }
}