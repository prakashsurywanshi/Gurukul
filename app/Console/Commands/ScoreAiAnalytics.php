<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\AiAnalytics\AiAnalyticsService;
use Illuminate\Console\Command;
use Throwable;

class ScoreAiAnalytics extends Command
{
    protected $signature = 'ai:score {organization? : Organization ID. When omitted, all organizations are scored.}';

    protected $description = 'Recompute deterministic AI analytics scores for one or all organizations.';

    public function handle(AiAnalyticsService $service): int
    {
        $organizationId = $this->argument('organization');

        $organizations = $organizationId
            ? Organization::query()->whereKey((int) $organizationId)->get()
            : Organization::query()->get();

        if ($organizations->isEmpty()) {
            $this->warn('No organizations found.');

            return Command::SUCCESS;
        }

        foreach ($organizations as $organization) {
            try {
                $result = $service->refreshOrganization($organization->id);
                $this->line("Scored {$organization->name}: {$result['leads']} leads, {$result['fees']} fee records, {$result['students']} students, {$result['routes']} route suggestions, {$result['alerts']} alerts.");
            } catch (Throwable $e) {
                $this->error("Failed to score {$organization->name}: {$e->getMessage()}");
            }
        }

        return Command::SUCCESS;
    }
}