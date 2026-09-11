<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HpcCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'framework_id',
        'name',
        'card_type',
        'description',
        'sections',
        'is_active',
    ];

    protected $casts = [
        'sections' => 'array',
        'is_active' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function framework(): BelongsTo
    {
        return $this->belongsTo(HpcFramework::class, 'framework_id');
    }

    public function studentCards(): HasMany
    {
        return $this->hasMany(HpcStudentCard::class, 'card_id');
    }
}