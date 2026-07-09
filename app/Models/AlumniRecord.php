<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AlumniRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'academic_year_id',
        'session',
        'admission_no',
        'first_name',
        'last_name',
        'email',
        'phone',
        'class',
        'section',
        'passing_year',
        'alumni_status',
        'current_city',
        'organization_name',
    ];
}
