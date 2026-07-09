<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'student_id',
        'submitted_by_user_id',
        'complainant_name',
        'phone',
        'source',
        'category',
        'assigned_to',
        'complaint_date',
        'status',
        'note',
        'action_taken',
    ];

    protected $casts = [
        'complaint_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
