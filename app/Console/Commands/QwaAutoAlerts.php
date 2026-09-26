<?php

namespace App\Console\Commands;

use App\Services\QwaAutoAlertService;
use Illuminate\Console\Command;

class QwaAutoAlerts extends Command
{
    protected $signature = 'qwa:auto-alerts
        {trigger? : A specific trigger key to run. Omit to run every scheduled trigger.}
        {--organization= : Limit execution to a single organization id.}';

    protected $description = 'Run the scheduled QWA automatic WhatsApp alert scans';

    public function handle(QwaAutoAlertService $autoAlertService): int
    {
        $trigger = $this->argument('trigger');
        $organizationId = $this->option('organization')
            ? (int) $this->option('organization')
            : null;

        $autoAlertService->runScheduled($trigger ? (string) $trigger : null, $organizationId);

        $this->info('QWA automatic alert scans completed.');

        return Command::SUCCESS;
    }
}