<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CbcAssessment extends Model
{
    protected $table = 'cbc_assessments';

    protected $fillable = [
        'organization_id',
        'student_id',
        'cbc_strand_id',
        'cbc_learning_outcome_id',
        'cbc_competency_id',
        'level',
        'notes',
        'assessed_by',
        'assessed_on',
    ];

    protected function casts(): array
    {
        return [
            'assessed_on' => 'date',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function strand(): BelongsTo
    {
        return $this->belongsTo(CbcStrand::class, 'cbc_strand_id');
    }

    public function learningOutcome(): BelongsTo
    {
        return $this->belongsTo(CbcLearningOutcome::class, 'cbc_learning_outcome_id');
    }

    public function competency(): BelongsTo
    {
        return $this->belongsTo(CbcCompetency::class, 'cbc_competency_id');
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessed_by');
    }
}