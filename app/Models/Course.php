<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'department',
        'duration_years',
        'total_semesters',
        'description',
        'status',
    ];

    protected $casts = [
        'duration_years' => 'integer',
        'total_semesters' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }
}