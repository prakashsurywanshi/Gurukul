<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomeworkSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'homework_id',
        'student_id',
        'submission_text',
        'attachments',
        'submitted_at',
        'marks_obtained',
        'teacher_remarks',
        'status',
        'evaluated_by',
    ];

    protected $casts = [
        'attachments' => 'array',
        'submitted_at' => 'datetime',
        'marks_obtained' => 'decimal:2',
    ];

    public function homework(): BelongsTo
    {
        return $this->belongsTo(Homework::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }
}
