<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherEvaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'teacher_id',
        'period',
        'scores',
        'total_score',
        'max_score',
        'strengths',
        'improvements',
        'status',
        'evaluated_by',
    ];

    protected $casts = [
        'scores' => 'array',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }
}