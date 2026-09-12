<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Broadcast extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'academic_year_id',
        'subject',
        'message',
        'channels',
        'recipient_group',
        'class_ids',
        'student_ids',
        'recipient_count',
        'sent_count',
        'delivered_count',
        'opened_count',
        'status',
        'sent_at',
        'created_by',
    ];

    protected $casts = [
        'channels' => 'array',
        'class_ids' => 'array',
        'student_ids' => 'array',
        'sent_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(BroadcastRecipient::class);
    }
}