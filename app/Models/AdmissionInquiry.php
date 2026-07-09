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
        'email_verified_at',
        'status',
        'enrolled_student_id',
        'enrolled_at',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'enrolled_at' => 'datetime',
    ];
}
