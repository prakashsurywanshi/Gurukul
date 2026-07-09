<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'exam_schedule_id',
        'student_id',
        'theory_marks',
        'practical_marks',
        'total_marks',
        'obtained_marks',
        'grade',
        'is_absent',
        'remarks',
        'entered_by',
    ];

    protected $casts = [
        'theory_marks' => 'decimal:2',
        'practical_marks' => 'decimal:2',
        'total_marks' => 'decimal:2',
        'obtained_marks' => 'decimal:2',
        'is_absent' => 'boolean',
    ];

    public function examSchedule(): BelongsTo
    {
        return $this->belongsTo(ExamSchedule::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
