<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'event_type',
        'label',
        'is_active',
        'channels',
        'recipient_roles',
        'conditions',
        'digest_summary',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'channels' => 'array',
        'recipient_roles' => 'array',
        'conditions' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeForEvent($query, string $eventType)
    {
        return $query->where('event_type', $eventType)->where('is_active', true);
    }
}