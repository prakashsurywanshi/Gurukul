<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HealthRecord extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'student_id',
        'record_date',
        'blood_group',
        'height_cm',
        'weight_kg',
        'blood_pressure',
        'pulse',
        'allergies',
        'medical_conditions',
        'medications',
        'remarks',
        'recorded_by',
    ];

    protected $casts = [
        'record_date' => 'date',
        'height_cm' => 'float',
        'weight_kg' => 'float',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}