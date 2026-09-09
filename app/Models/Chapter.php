<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chapter extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'subject_id',
        'parent_id',
        'name',
        'description',
        'sort_order',
    ];

    public const TYPE_CHAPTER = 'chapter';
    public const TYPE_TOPIC = 'topic';

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Chapter::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Chapter::class, 'parent_id')->orderBy('sort_order')->orderBy('name');
    }

    public function getTypeAttribute(): string
    {
        return $this->parent_id ? self::TYPE_TOPIC : self::TYPE_CHAPTER;
    }
}