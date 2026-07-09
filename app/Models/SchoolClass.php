<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolClass extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'organization_id',
        'academic_year_id',
        'name',
        'section',
        'class_teacher_id',
        'capacity',
        'room_number',
        'description',
        'status',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'class_teacher_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function studentAcademicHistories(): HasMany
    {
        return $this->hasMany(StudentAcademicHistory::class, 'class_id');
    }

    public function scopeForCurrentSession(Builder $query, int $organizationId): Builder
    {
        $organization = Organization::query()->find($organizationId);
        $activeAcademicYearId = $organization?->selectedAcademicYear()?->id;

        return $query
            ->where('organization_id', $organizationId)
            ->when(
                $activeAcademicYearId,
                fn (Builder $sessionQuery) => $sessionQuery->where('academic_year_id', $activeAcademicYearId),
                fn (Builder $sessionQuery) => $sessionQuery->whereRaw('1 = 0')
            );
    }
}
