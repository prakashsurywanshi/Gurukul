<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QwaAutoAlertLog extends Model
{
    use HasFactory;

    protected $table = 'qwa_auto_alert_log';

    protected $fillable = [
        'organization_id',
        'rule_id',
        'recipient_phone',
        'event_key',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(QwaAutoAlertRule::class);
    }
}