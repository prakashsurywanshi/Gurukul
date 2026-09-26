<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QwaAutoAlertRule extends Model
{
    use HasFactory;

    protected $table = 'qwa_auto_alert_rules';

    protected $fillable = [
        'organization_id',
        'qwa_template_id',
        'trigger_event',
        'enabled',
        'recipient_type',
        'recipient_roles',
        'schedule_time',
        'language',
        'last_fired_at',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'recipient_roles' => 'array',
        'last_fired_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(QwaWhatsappTemplate::class, 'qwa_template_id');
    }
}