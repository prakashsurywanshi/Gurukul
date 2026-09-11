<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HpcStudentCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'card_id',
        'academic_year_id',
        'data',
        'status',
        'published_at',
    ];

    protected $casts = [
        'data' => 'array',
        'published_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(HpcCard::class, 'card_id');
    }
}