<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'academic_year_id',
        'semester_id',
        'name',
        'exam_type',
        'publish_status',
        'start_date',
        'end_date',
        'description',
        'status',
        'datesheet_note',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function schedules(): HasMany
    {
        return $this->hasMany(ExamSchedule::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
