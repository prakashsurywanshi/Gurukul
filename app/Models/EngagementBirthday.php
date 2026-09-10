<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EngagementBirthday extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'person_name',
        'birth_date',
        'person_type',
        'user_id',
        'notes',
    ];

    protected $casts = [
        'birth_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
