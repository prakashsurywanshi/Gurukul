<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GatePass extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'person_type',
        'student_id',
        'staff_user_id',
        'person_name',
        'person_contact',
        'pass_type',
        'reason',
        'expected_return_at',
        'used_at',
        'status',
        'created_by_user_id',
    ];

    protected $casts = [
        'expected_return_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}