<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'sender_id',
        'audience_type',
        'recipient_summary',
        'recipient_count',
        'recipient_phones',
        'recipient_details',
        'subject',
        'content',
        'status',
        'queued_at',
        'sent_at',
        'provider_name',
        'provider_reference',
        'provider_response',
        'error_message',
    ];

    protected $casts = [
        'recipient_phones' => 'array',
        'recipient_details' => 'array',
        'provider_response' => 'array',
        'queued_at' => 'datetime',
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