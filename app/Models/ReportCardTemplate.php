<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportCardTemplate extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'layout',
        'show_rank',
        'show_percentage',
        'show_remarks',
        'show_subject_wise_grade',
        'header_color',
        'remarks',
        'is_default',
    ];

    protected $casts = [
        'show_rank' => 'boolean',
        'show_percentage' => 'boolean',
        'show_remarks' => 'boolean',
        'show_subject_wise_grade' => 'boolean',
        'is_default' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}