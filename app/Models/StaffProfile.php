<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'aadhar_number',
        'pan',
        'national_teacher_id',
        'employee_code',
        'appointment_date',
        'appointment_type',
        'recruitment_type',
        'post',
        'pay_scale',
        'basic_pay',
        'government_service_join_date',
        'qualification',
        'teaching_qualification',
        'tet_status',
        'mother_tongue',
        'religion',
        'category',
        'subjects_taught',
        'experience_years',
        'training_received',
        'teacher_type',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
            'government_service_join_date' => 'date',
            'basic_pay' => 'decimal:2',
            'subjects_taught' => 'array',
            'experience_years' => 'integer',
            'training_received' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}