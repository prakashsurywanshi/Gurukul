<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdmissionInquiry extends Model
{
    protected $fillable = [
        'organization_id',
        'full_name',
        'email',
        'phone',
        'program_interest',
        'student_stage',
        'previous_institution',
        'message',
        'custom_data',
        'email_verified_at',
        'status',
        'enrolled_student_id',
        'enrolled_at',
    ];

    protected $casts = [
        'custom_data' => 'array',
        'email_verified_at' => 'datetime',
        'enrolled_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Inquiries arrive from the public admissions form, which has no tenant
     * context. This relation is how an inquiry is attributed to a school.
     */
    public function enrolledStudent(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'enrolled_student_id');
    }
}
