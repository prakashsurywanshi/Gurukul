<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HostelRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'hostel_id',
        'room_number',
        'floor',
        'room_type',
        'capacity',
        'occupied',
        'monthly_fee',
        'facilities',
        'status',
    ];

    protected $casts = [
        'facilities' => 'array',
        'monthly_fee' => 'decimal:2',
    ];

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function beds(): HasMany
    {
        return $this->hasMany(HostelBed::class, 'room_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(HostelAllocation::class, 'room_id');
    }
}
