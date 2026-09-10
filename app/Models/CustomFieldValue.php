<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomFieldValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'entity',
        'entity_id',
        'field_id',
        'value',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(CustomFieldDefinition::class, 'field_id');
    }
}