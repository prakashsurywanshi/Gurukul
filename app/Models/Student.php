<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes, \App\Models\Concerns\Localizable;

    protected $fillable = [
        'organization_id',
        'user_id',
        'class_id',
        'admission_no',
        'roll_number',
        'qr_token',
        'first_name',
        'middle_name',
        'last_name',
        'middle_name_mr',
        'first_name_mr',
        'last_name_mr',
        'date_of_birth',
        'gender',
        'blood_group',
        'nationality',
        'religion',
        'caste',
        'category',
        'house',
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
        'father_name_mr',
        'father_occupation_mr',
        'mother_name',
        'mother_phone',
        'mother_email',
        'mother_occupation',
        'mother_income',
        'mother_name_mr',
        'mother_occupation_mr',
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
        'enrollment_status',
        'notes',
        'address_mr',
        'city_mr',
        'state_mr',
        'religion_mr',
        'caste_mr',
        'previous_school_mr',
        'transport_pickup_point_mr',
        'transport_route_details_mr',
        'notes_mr',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function academicHistories(): HasMany
    {
        return $this->hasMany(StudentAcademicHistory::class);
    }

    public function issuedCertificates(): HasMany
    {
        return $this->hasMany(IssuedCertificate::class);
    }

    public function exits(): HasMany
    {
        return $this->hasMany(StudentExit::class);
    }

    public function latestExit(): HasOne
    {
        return $this->hasOne(StudentExit::class)->latestOfMany();
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
