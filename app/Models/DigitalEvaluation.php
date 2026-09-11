<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalEvaluation extends Model
{
    protected $fillable = [
        'organization_id',
        'title',
        'class_id',
        'subject_id',
        'total_marks',
        'total_scripts',
        'evaluated_scripts',
        'status',
        'due_date',
        'evaluator_name',
        'notes',
    ];

    protected $casts = [
        'total_marks' => 'decimal:2',
        'due_date' => 'date',
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