<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HostelLostFoundItem extends Model
{
    protected $fillable = [
        'organization_id',
        'hostel_id',
        'student_id',
        'reported_by_user_id',
        'item_type',
        'item_name',
        'location',
        'reported_date',
        'description',
        'contact',
        'status',
        'resolution_note',
    ];

    protected $casts = [
        'reported_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }
}
