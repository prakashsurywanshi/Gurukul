<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentImport extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'requested_by_user_id',
        'status',
        'queue',
        'source_path',
        'submitted_count',
        'created_count',
        'skipped_count',
        'errors',
        'error_message',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'errors' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }
}
