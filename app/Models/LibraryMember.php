<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LibraryMember extends Model
{
    protected $fillable = [
        'organization_id',
        'member_type',
        'student_id',
        'user_id',
        'library_card_number',
        'fine_due',
    ];

    protected $casts = [
        'fine_due' => 'float',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function circulations(): HasMany
    {
        return $this->hasMany(LibraryCirculation::class);
    }
}
