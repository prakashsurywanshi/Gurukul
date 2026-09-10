<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'survey_response_id',
        'survey_question_id',
        'rating',
        'answer_text',
        'choices',
    ];

    protected $casts = [
        'rating' => 'integer',
        'choices' => 'array',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(SurveyResponse::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(SurveyQuestion::class);
    }
}