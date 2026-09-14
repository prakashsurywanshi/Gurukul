<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\SystemNotificationService;
use Illuminate\Console\Command;

class SendNotificationDigest extends Command
{
    protected $signature = 'notifications:digest';

    protected $description = 'Send daily digest summaries to users with unread notifications';

    public function handle(SystemNotificationService $notificationService): int
    {
        $organizations = Organization::query()->where('status', 'active')->get();

        $totalSent = 0;

        foreach ($organizations as $organization) {
            $settings = $notificationService->getSettings($organization);

            if (! ($settings['daily_digest'] ?? true)) {
                continue;
            }

            $users = User::query()
                ->where('organization_id', $organization->id)
                ->whereIn('role', ['admin', 'super_admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
                ->where('status', 'active')
                ->get();

            foreach ($users as $user) {
                $unreadCount = SystemNotification::query()
                    ->where('user_id', $user->id)
                    ->where('organization_id', $organization->id)
                    ->where('is_read', false)
                    ->count();

                if ($unreadCount === 0) {
                    continue;
                }

                $breakdown = SystemNotification::query()
                    ->where('user_id', $user->id)
                    ->where('organization_id', $organization->id)
                    ->where('is_read', false)
                    ->selectRaw('type, count(*) as cnt')
                    ->groupBy('type')
                    ->pluck('cnt', 'type')
                    ->toArray();

                $lines = [];
                foreach ($breakdown as $type => $count) {
                    $label = ucwords(str_replace('_', ' ', $type));
                    $lines[] = "{$count} {$label}";
                }

                $summary = $unreadCount.' unread: '.implode(', ', $lines);

                $notificationService->notifyUser(
                    $user,
                    $organization,
                    'daily_digest',
                    'Daily notification digest',
                    $summary,
                    ['action_label' => 'View All', 'action_url' => '/notifications'],
                );

                $totalSent++;
            }
        }

        $this->info("Digest sent to {$totalSent} users.");

        return Command::SUCCESS;
    }
}