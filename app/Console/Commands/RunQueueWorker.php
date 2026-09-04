<?php

namespace App\Console\Commands;

use App\Models\SuperAdminSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class RunQueueWorker extends Command
{
    protected $signature = 'queue:worker:run';

    protected $description = 'Run the queue worker for the cron scheduler, respecting the current worker control state.';

    public function handle(): int
    {
        $settings = SuperAdminSetting::singleton();

        if (($settings->queue_worker_status ?? 'running') !== 'running') {
            $this->info(sprintf('Queue worker is %s. Skipping.', $settings->queue_worker_status));

            return self::SUCCESS;
        }

        $this->info('Queue worker is enabled. Processing pending jobs.');

        Artisan::call('queue:work', [
            'connection' => 'database',
            '--queue' => 'imports,whatsapp,default',
            '--stop-when-empty' => true,
            '--tries' => 3,
            '--timeout' => 120,
        ]);

        return self::SUCCESS;
    }
}
