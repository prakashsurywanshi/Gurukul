<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobPosting extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'title',
        'department',
        'position_type',
        'vacancies',
        'description',
        'requirements',
        'salary_range',
        'qualifications',
        'status',
        'application_deadline',
        'created_by',
    ];

    protected $casts = [
        'vacancies' => 'integer',
        'application_deadline' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}