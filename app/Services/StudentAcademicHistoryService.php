<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class StudentAcademicHistoryService
{
    public function syncCurrentRecord(Student $student, ?string $entryType = null, ?string $notes = null): ?StudentAcademicHistory
    {
        $student->loadMissing('schoolClass');

        if (! $student->organization_id) {
            return null;
        }

        $organization = Organization::query()->find($student->organization_id);
        $schoolClass = $student->schoolClass;
        $academicYear = $schoolClass?->academic_year_id
            ? AcademicYear::query()->find($schoolClass->academic_year_id)
            : $this->getActiveAcademicYear($student->organization_id);

        StudentAcademicHistory::query()
            ->where('student_id', $student->id)
            ->update(['is_current' => false]);

        return StudentAcademicHistory::query()->updateOrCreate(
            [
                'student_id' => $student->id,
                'academic_year_id' => $academicYear?->id,
            ],
            [
                'organization_id' => $student->organization_id,
                'class_id' => $student->class_id,
                'session' => $academicYear?->name,
                'roll_number' => $student->roll_number,
                'status' => $student->status,
                'is_current' => true,
                'entry_type' => $entryType ?: 'updated',
                'effective_date' => $student->admission_date ?: now()->toDateString(),
                'notes' => $notes,
            ]
        );
    }

    public function promoteStudent(Student $student, SchoolClass $targetClass, AcademicYear $targetSession, ?string $notes = null): StudentAcademicHistory
    {
        StudentAcademicHistory::query()
            ->where('student_id', $student->id)
            ->update(['is_current' => false]);

        return StudentAcademicHistory::query()->updateOrCreate(
            [
                'student_id' => $student->id,
                'academic_year_id' => $targetSession->id,
            ],
            [
                'organization_id' => $student->organization_id,
                'class_id' => $targetClass->id,
                'session' => $targetSession->name,
                'roll_number' => $student->roll_number,
                'status' => $student->status,
                'is_current' => true,
                'entry_type' => 'promotion',
                'effective_date' => now()->toDateString(),
                'notes' => $notes,
            ]
        );
    }

    public function getStudentHistory(Student $student)
    {
        return StudentAcademicHistory::query()
            ->where('student_id', $student->id)
            ->with([
                'academicYear:id,name,start_date,end_date',
                'schoolClass:id,name,section',
            ])
            ->orderByDesc('is_current')
            ->orderByDesc('effective_date')
            ->orderByDesc('created_at')
            ->get();
    }

    public function getActiveAcademicYear(int $organizationId): ?AcademicYear
    {
        $organization = Organization::query()->find($organizationId);

        return $organization?->selectedAcademicYear();
    }

    public function getSessionEnrollments(int $organizationId, ?int $academicYearId = null): Collection
    {
        $targetAcademicYearId = $academicYearId ?: $this->getActiveAcademicYear($organizationId)?->id;

        if (! $targetAcademicYearId) {
            return collect();
        }

        return StudentAcademicHistory::query()
            ->where('organization_id', $organizationId)
            ->where('academic_year_id', $targetAcademicYearId)
            ->with([
                'student:id,organization_id,user_id,class_id,admission_no,roll_number,first_name,last_name,email,status',
                'schoolClass:id,name,section,academic_year_id',
                'academicYear:id,name',
            ])
            ->orderBy('roll_number')
            ->orderBy('student_id')
            ->get()
            ->values();
    }

    public function getSessionEnrollmentForStudent(Student $student, ?int $academicYearId = null): ?StudentAcademicHistory
    {
        $targetAcademicYearId = $academicYearId ?: $this->getActiveAcademicYear($student->organization_id)?->id;

        if (! $targetAcademicYearId) {
            return null;
        }

        return StudentAcademicHistory::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $targetAcademicYearId)
            ->with([
                'schoolClass:id,name,section,academic_year_id',
                'academicYear:id,name',
            ])
            ->first();
    }

    public function getSessionEnrollmentQuery(int $organizationId, ?int $academicYearId = null): Builder
    {
        $targetAcademicYearId = $academicYearId ?: $this->getActiveAcademicYear($organizationId)?->id;

        return StudentAcademicHistory::query()
            ->where('organization_id', $organizationId)
            ->when($targetAcademicYearId, fn (Builder $query) => $query->where('academic_year_id', $targetAcademicYearId));
    }
}
