<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomFieldDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'entity',
        'label',
        'field_key',
        'field_type',
        'options',
        'pattern',
        'pattern_message',
        'min_value',
        'max_value',
        'min_length',
        'max_length',
        'is_required',
        'is_active',
        'show_in_admission',
        'sort_order',
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
        'is_active' => 'boolean',
        'show_in_admission' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class, 'field_id');
    }
}