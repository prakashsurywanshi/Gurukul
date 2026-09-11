<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OsmEvaluation extends Model
{
    protected $table = 'osm_evaluations';

    protected $fillable = [
        'organization_id',
        'osm_session_id',
        'osm_sheet_id',
        'student_id',
        'score',
        'grade_level',
        'feedback',
        'status',
        'evaluated_by',
        'evaluated_at',
        'moderated_by',
        'moderated_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'float',
            'evaluated_at' => 'datetime',
            'moderated_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function sheet(): BelongsTo
    {
        return $this->belongsTo(OsmSheet::class, 'osm_sheet_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(OsmSession::class, 'osm_session_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }
}