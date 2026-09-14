<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmissionInquiry extends Model
{
    protected $fillable = [
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
}
