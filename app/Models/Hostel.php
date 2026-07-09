<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hostel extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'type',
        'address',
        'total_rooms',
        'warden_id',
        'warden_name',
        'warden_phone',
        'status',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function warden(): BelongsTo
    {
        return $this->belongsTo(User::class, 'warden_id');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(HostelRoom::class);
    }

    public function beds(): HasMany
    {
        return $this->hasMany(HostelBed::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(HostelAllocation::class);
    }

    public function feeStructures(): HasMany
    {
        return $this->hasMany(HostelFeeStructure::class);
    }
}
