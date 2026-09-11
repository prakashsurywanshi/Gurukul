<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HpcActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'academic_year_id',
        'category',
        'title',
        'description',
        'rating',
        'teacher_remark',
        'occurred_at',
    ];

    protected $casts = [
        'rating' => 'decimal:1',
        'occurred_at' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}