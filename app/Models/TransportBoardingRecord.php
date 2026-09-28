<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportBoardingRecord extends Model
{
    protected $fillable = [
        'organization_id',
        'daily_trip_id',
        'student_id',
        'direction',
        'status',
        'boarded_at',
        'recorded_by_user_id',
        'note',
    ];

    protected $casts = [
        'boarded_at' => 'datetime',
    ];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(DailyTrip::class, 'daily_trip_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}