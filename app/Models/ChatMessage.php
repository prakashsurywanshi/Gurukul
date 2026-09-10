<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'sender_user_id',
        'conversation_key',
        'body',
        'message_type',
        'is_flagged',
        'moderation_status',
        'moderated_by',
        'moderation_action',
        'moderation_reason',
        'moderated_at',
    ];

    protected $casts = [
        'is_flagged' => 'boolean',
        'moderated_at' => 'datetime',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }
}
