<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffAppraisal extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'staff_user_id',
        'appraisal_cycle_id',
        'criteria',
        'overall_score',
        'rating',
        'reviewer_user_id',
        'feedback',
        'status',
        'review_date',
    ];

    protected function casts(): array
    {
        return [
            'criteria' => 'array',
            'overall_score' => 'integer',
            'review_date' => 'date',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(AppraisalCycle::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }
}