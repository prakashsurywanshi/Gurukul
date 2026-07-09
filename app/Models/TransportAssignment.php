<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransportAssignment extends Model
{
    protected $table = 'student_transport';

    protected $fillable = [
        'academic_year_id', 'student_id', 'route_id', 'vehicle_id', 'pickup_point', 'drop_point',
        'pickup_time', 'drop_time', 'monthly_fee', 'status',
    ];

    protected $casts = [
        'monthly_fee' => 'float',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(TransportRoute::class, 'route_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(TransportVehicle::class, 'vehicle_id');
    }

    public function feeRecords(): HasMany
    {
        return $this->hasMany(StudentFee::class, 'transport_assignment_id');
    }
}
