<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnlineExamAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'online_exam_id',
        'organization_id',
        'user_id',
        'student_id',
        'exam_title',
        'subject',
        'class_name',
        'section',
        'started_at',
        'submitted_at',
        'status',
        'answers',
        'question_order',
        'question_snapshot',
        'total_questions',
        'attempted_questions',
        'correct_answers',
        'wrong_answers',
        'unanswered_questions',
        'total_marks',
        'obtained_marks',
        'negative_marks_applied',
        'percentage',
    ];

    protected $casts = [
        'answers' => 'array',
        'question_order' => 'array',
        'question_snapshot' => 'array',
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'total_marks' => 'decimal:2',
        'obtained_marks' => 'decimal:2',
        'negative_marks_applied' => 'decimal:2',
        'percentage' => 'decimal:2',
    ];

    public function onlineExam(): BelongsTo
    {
        return $this->belongsTo(OnlineExam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
