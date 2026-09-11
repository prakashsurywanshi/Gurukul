<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Assessment extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'class_id',
        'subject_id',
        'term',
        'assessment_type',
        'weightage',
        'total_marks',
        'start_date',
        'end_date',
        'status',
        'description',
    ];

    protected $casts = [
        'weightage' => 'decimal:2',
        'total_marks' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function class(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}