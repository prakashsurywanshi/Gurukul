<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoiceCallLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'sender_id',
        'audience_type',
        'recipient_summary',
        'recipient_count',
        'recipient_phones',
        'subject',
        'content',
        'audio_file_path',
        'audio_file_name',
        'audio_mime_type',
        'audio_file_size',
        'status',
        'scheduled_for',
        'sent_at',
        'provider_name',
        'provider_reference',
        'provider_response',
        'error_message',
    ];

    protected $casts = [
        'recipient_phones' => 'array',
        'provider_response' => 'array',
        'scheduled_for' => 'datetime',
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
