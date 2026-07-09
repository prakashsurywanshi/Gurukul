<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'sender_id',
        'audience_type',
        'recipient_summary',
        'recipient_count',
        'recipient_emails',
        'subject',
        'content',
        'status',
        'sent_at',
        'error_message',
    ];

    protected $casts = [
        'recipient_emails' => 'array',
        'sent_at' => 'datetime',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
