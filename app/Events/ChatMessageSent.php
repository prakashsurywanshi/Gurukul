<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public Message $message,
        public int $recipientId,
        public int $senderId,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('chat.' . $this->recipientId);
    }

    public function broadcastAs(): string
    {
        return 'ChatMessageSent';
    }
}