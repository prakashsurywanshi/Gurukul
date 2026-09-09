<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnlineExam extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'created_by',
        'title',
        'subject',
        'class_name',
        'section',
        'target_class_sections',
        'duration',
        'start_time',
        'end_time',
        'negative_marking_enabled',
        'negative_marks',
        'shuffle_questions',
        'status',
        'questions',
    ];

    protected $casts = [
        'questions' => 'array',
        'target_class_sections' => 'array',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'negative_marking_enabled' => 'boolean',
        'shuffle_questions' => 'boolean',
        'negative_marks' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(OnlineExamAttempt::class);
    }
}
