<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'user_id',
        'class_id',
        'admission_no',
        'roll_number',
        'first_name',
        'last_name',
        'date_of_birth',
        'gender',
        'blood_group',
        'nationality',
        'religion',
        'caste',
        'category',
        'mother_tongue',
        'aadhar_number',
        'profile_photo',
        'email',
        'phone',
        'current_address',
        'permanent_address',
        'city',
        'state',
        'pincode',
        'father_name',
        'father_phone',
        'father_email',
        'father_occupation',
        'father_income',
        'mother_name',
        'mother_phone',
        'mother_email',
        'mother_occupation',
        'mother_income',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
        'guardian_relation',
        'admission_date',
        'previous_school',
        'previous_class',
        'previous_percentage',
        'tc_number',
        'tc_issue_date',
        'medical_conditions',
        'allergies',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'transport_required',
        'transport_pickup_point',
        'transport_vehicle',
        'transport_route',
        'transport_route_details',
        'hostel_required',
        'hostel_room',
        'birth_certificate',
        'transfer_certificate',
        'marksheet',
        'aadhar_card',
        'photo',
        'other_documents',
        'status',
        'notes',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'admission_date' => 'date',
        'tc_issue_date' => 'date',
        'transport_required' => 'boolean',
        'hostel_required' => 'boolean',
        'other_documents' => 'array',
    ];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function academicHistories(): HasMany
    {
        return $this->hasMany(StudentAcademicHistory::class);
    }

    public function scopeForCurrentSession(Builder $query, int $organizationId): Builder
    {
        $organization = Organization::query()->find($organizationId);
        $activeAcademicYearId = $organization?->selectedAcademicYear()?->id;

        return $query
            ->where('organization_id', $organizationId)
            ->when(
                $activeAcademicYearId,
                fn (Builder $sessionQuery) => $sessionQuery->whereHas(
                    'academicHistories',
                    fn (Builder $historyQuery) => $historyQuery->where('academic_year_id', $activeAcademicYearId)
                ),
                fn (Builder $sessionQuery) => $sessionQuery->whereRaw('1 = 0')
            );
    }
}
