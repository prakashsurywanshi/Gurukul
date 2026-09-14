<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalFlowStep extends Model
{
    use HasFactory;

    public const ACTOR_TYPES = ['role', 'user'];

    protected $fillable = [
        'approval_flow_id',
        'step_no',
        'actor_type',
        'actor_value',
        'note',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'approval_flow_id');
    }
}