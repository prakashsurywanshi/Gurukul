<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAcademicHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'academic_year_id',
        'class_id',
        'course_id',
        'batch_id',
        'semester_id',
        'session',
        'roll_number',
        'status',
        'is_current',
        'entry_type',
        'effective_date',
        'notes',
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'effective_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
