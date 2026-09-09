<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    public const STATUSES = ['new', 'contacted', 'interested', 'admitted', 'lost', 'closed'];

    public const SOURCES = ['walkin', 'call', 'social', 'website', 'referral', 'other'];

    public const PRIORITIES = ['low', 'medium', 'high'];

    protected $fillable = [
        'organization_id',
        'student_name',
        'parent_name',
        'phone',
        'email',
        'source',
        'interested_class',
        'academic_year',
        'status',
        'priority',
        'preferred_contact_time',
        'follow_up_date',
        'notes',
        'assigned_to',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'follow_up_date' => 'date',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}