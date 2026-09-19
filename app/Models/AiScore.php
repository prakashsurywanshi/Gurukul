<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiScore extends Model
{
    public const CATEGORIES = ['lead', 'fee_defaulter', 'student_risk', 'route'];

    public const TIERS = ['low', 'medium', 'high'];

    protected $fillable = [
        'organization_id',
        'category',
        'entity_type',
        'entity_id',
        'score',
        'tier',
        'score_breakdown',
        'context',
        'narrative',
        'computed_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'score_breakdown' => 'array',
        'context' => 'array',
        'computed_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}