<?php

namespace App\Events;

use App\Models\SystemNotification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SystemNotificationCreated implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public SystemNotification $notification
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('notifications.' . $this->notification->user_id);
    }

    public function broadcastAs(): string
    {
        return 'SystemNotificationCreated';
    }
}