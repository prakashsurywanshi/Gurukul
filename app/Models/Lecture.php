<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lecture extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'class_id',
        'subject_id',
        'teacher_id',
        'semester_id',
        'day_of_week',
        'start_time',
        'end_time',
        'room',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}