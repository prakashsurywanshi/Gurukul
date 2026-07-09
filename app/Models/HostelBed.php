<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HostelBed extends Model
{
    use HasFactory;

    protected $fillable = [
        'hostel_id',
        'room_id',
        'bed_number',
        'status',
    ];

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(HostelRoom::class, 'room_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(HostelAllocation::class, 'bed_id');
    }
}
