<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\StaffPermissionService;
use Illuminate\Console\Command;

class SyncRolePermissionDefaults extends Command
{
    protected $signature = 'permissions:sync-defaults
                            {organization? : Organization ID. When omitted, every organization is synced.}
                            {--role= : Limit the sync to a single system role slug, e.g. transport_manager.}';

    protected $description = 'Make built-in staff roles match RolePermissionCatalog exactly (grants and revocations).';

    public function handle(StaffPermissionService $service): int
    {
        $organizationId = $this->argument('organization');
        $roleSlug = $this->option('role');

        $organizations = $organizationId
            ? Organization::query()->whereKey((int) $organizationId)->get()
            : Organization::query()->get();

        if ($organizations->isEmpty()) {
            $this->warn('No organizations found.');

            return Command::SUCCESS;
        }

        foreach ($organizations as $organization) {
            $synced = $service->syncSystemRoleDefaults($organization, $roleSlug ?: null);
            $this->line("{$organization->name}: synced {$synced} role permissions.");
        }

        $this->comment('Local permission customizations for the synced roles were overwritten.');

        return Command::SUCCESS;
    }
}