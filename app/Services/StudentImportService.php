<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class StudentImportService
{
    private ?array $studentTableColumns = null;

    public function __construct(
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService
    ) {}

    public function import(array $studentRows, Organization $organization): array
    {
        $createdCount = 0;
        $errors = [];

        foreach ($studentRows as $index => $studentInput) {
            try {
                $studentData = is_array($studentInput) ? $studentInput : [];
                $validatedStudent = $this->validateStudentPayload($studentData, $organization);

                try {
                    DB::transaction(function () use ($validatedStudent, $organization) {
                        $student = Student::query()->create($this->buildStudentAttributes($validatedStudent, $organization));
                        $this->studentAcademicHistoryService->syncCurrentRecord($student->fresh('schoolClass'), 'admission', 'Imported from bulk student upload.');
                    });
                    $createdCount++;
                } catch (QueryException $exception) {
                    if ($this->isDuplicateAdmissionNumberException($exception)) {
                        $errors[] = 'Row '.($index + 1).': Admission number could not be generated uniquely. Please retry the import.';

                        continue;
                    }

                    report($exception);

                    $errors[] = 'Row '.($index + 1).': This student could not be imported because of a database error.';
                }
            } catch (ValidationException $exception) {
                $messages = collect($exception->errors())->flatten()->implode(' ');
                $errors[] = 'Row '.($index + 1).': '.$messages;
            } catch (Throwable $exception) {
                report($exception);

                $errors[] = 'Row '.($index + 1).': This student could not be imported.';
            }
        }

        return [
            'created_count' => $createdCount,
            'error_count' => count($errors),
            'errors' => $errors,
        ];
    }

    private function validateStudentPayload(array $payload, Organization $organization): array
    {
        $validated = validator($payload, [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'first_name_mr' => ['nullable', 'string', 'max:255'],
            'last_name_mr' => ['nullable', 'string', 'max:255'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('students', 'email'),
                Rule::unique('users', 'email'),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'blood_group' => ['nullable', 'string', 'max:20'],
            'class' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:255'],
            'roll_number' => ['nullable', 'string', 'max:50'],
            'register_no' => ['nullable', 'string', 'max:50'],
            'udise_student_id' => ['nullable', 'string', 'max:100'],
            'saral_student_id' => ['nullable', 'string', 'max:100'],
            'aadhar_number' => ['nullable', 'string', 'max:20'],
            'admission_date' => ['required', 'date'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'father_phone' => ['nullable', 'string', 'max:30'],
            'father_occupation' => ['nullable', 'string', 'max:255'],
            'father_name_mr' => ['nullable', 'string', 'max:255'],
            'father_occupation_mr' => ['nullable', 'string', 'max:255'],
            'mother_name' => ['nullable', 'string', 'max:255'],
            'mother_phone' => ['nullable', 'string', 'max:30'],
            'mother_occupation' => ['nullable', 'string', 'max:255'],
            'mother_name_mr' => ['nullable', 'string', 'max:255'],
            'mother_occupation_mr' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'address_mr' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'city_mr' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'state_mr' => ['nullable', 'string', 'max:255'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'category' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', 'string', 'max:100'],
            'religion_mr' => ['nullable', 'string', 'max:100'],
            'caste' => ['nullable', 'string', 'max:100'],
            'caste_mr' => ['nullable', 'string', 'max:100'],
            'previous_school' => ['nullable', 'string', 'max:255'],
            'previous_school_mr' => ['nullable', 'string', 'max:255'],
            'transport_required' => ['nullable', 'boolean'],
            'transport_pickup_point' => ['nullable', 'string', 'max:255'],
            'transport_pickup_point_mr' => ['nullable', 'string', 'max:255'],
            'transport_vehicle' => ['nullable', 'string', 'max:255'],
            'transport_route_details' => ['nullable', 'string'],
            'transport_route_details_mr' => ['nullable', 'string'],
            'hostel_required' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'notes_mr' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'graduated', 'transferred', 'expelled'])],
        ], [
            'email.unique' => 'This email is already registered.',
        ])->validate();

        $schoolClass = $this->resolveClassForOrganization(
            $organization,
            (string) $validated['class'],
            (string) $validated['section']
        );

        if (! $schoolClass) {
            throw ValidationException::withMessages([
                'class' => ['The selected class and section do not exist for this organization.'],
            ]);
        }

        $validated['class_id'] = $schoolClass->id;
        $validated['transport_required'] = filter_var($validated['transport_required'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $validated['hostel_required'] = filter_var($validated['hostel_required'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return $validated;
    }

    private function buildStudentAttributes(array $validated, Organization $organization): array
    {
        $admissionNumber = $this->generateAdmissionNumber();
        $studentEmail = $this->resolveStudentEmail($validated['email'] ?? null, $organization, $admissionNumber);

        $attributes = [
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'],
            'admission_no' => $admissionNumber,
            'roll_number' => $validated['roll_number'] ?? null,
            'register_no' => $validated['register_no'] ?? null,
            'udise_student_id' => $validated['udise_student_id'] ?? null,
            'saral_student_id' => $validated['saral_student_id'] ?? null,
            'aadhar_number' => $validated['aadhar_number'] ?? null,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'first_name_mr' => $validated['first_name_mr'] ?? null,
            'last_name_mr' => $validated['last_name_mr'] ?? null,
            'date_of_birth' => $validated['date_of_birth'],
            'gender' => $validated['gender'],
            'blood_group' => $validated['blood_group'] ?? null,
            'religion' => $validated['religion'] ?? null,
            'religion_mr' => $validated['religion_mr'] ?? null,
            'caste' => $validated['caste'] ?? null,
            'caste_mr' => $validated['caste_mr'] ?? null,
            'category' => $validated['category'] ?? null,
            'email' => $studentEmail,
            'phone' => $validated['phone'] ?? null,
            'current_address' => $validated['address'] ?? null,
            'permanent_address' => $validated['address'] ?? null,
            'address_mr' => $validated['address_mr'] ?? null,
            'city' => $validated['city'] ?? null,
            'city_mr' => $validated['city_mr'] ?? null,
            'state' => $validated['state'] ?? null,
            'state_mr' => $validated['state_mr'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
            'father_name' => $validated['father_name'] ?? null,
            'father_name_mr' => $validated['father_name_mr'] ?? null,
            'father_phone' => $validated['father_phone'] ?? null,
            'father_occupation' => $validated['father_occupation'] ?? null,
            'father_occupation_mr' => $validated['father_occupation_mr'] ?? null,
            'mother_name' => $validated['mother_name'] ?? null,
            'mother_name_mr' => $validated['mother_name_mr'] ?? null,
            'mother_phone' => $validated['mother_phone'] ?? null,
            'mother_occupation' => $validated['mother_occupation'] ?? null,
            'mother_occupation_mr' => $validated['mother_occupation_mr'] ?? null,
            'admission_date' => $validated['admission_date'],
            'previous_school' => $validated['previous_school'] ?? null,
            'previous_school_mr' => $validated['previous_school_mr'] ?? null,
            'transport_required' => $validated['transport_required'],
            'transport_pickup_point' => $validated['transport_required'] ? ($validated['transport_pickup_point'] ?? null) : null,
            'transport_pickup_point_mr' => $validated['transport_required'] ? ($validated['transport_pickup_point_mr'] ?? null) : null,
            'transport_vehicle' => $validated['transport_required'] ? ($validated['transport_vehicle'] ?? null) : null,
            'transport_route' => $validated['transport_required'] ? ($validated['transport_route_details'] ?? null) : null,
            'transport_route_details' => $validated['transport_required'] ? ($validated['transport_route_details'] ?? null) : null,
            'transport_route_details_mr' => $validated['transport_required'] ? ($validated['transport_route_details_mr'] ?? null) : null,
            'hostel_required' => $validated['hostel_required'],
            'notes' => $validated['notes'] ?? null,
            'notes_mr' => $validated['notes_mr'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ];

        return array_intersect_key($attributes, array_flip($this->getStudentTableColumns()));
    }

    private function resolveStudentEmail(?string $requestedEmail, Organization $organization, string $admissionNumber): string
    {
        $baseEmail = $requestedEmail ?: Str::lower($admissionNumber.'@students.'.($organization->slug ?: 'gurukul').'.local');
        $email = Str::lower(trim($baseEmail));

        if (! $this->emailExists($email)) {
            return $email;
        }

        $localPart = Str::before($email, '@');
        $domainPart = Str::after($email, '@');
        $suffix = 1;

        do {
            $candidate = $localPart.$suffix.'@'.$domainPart;
            $suffix++;
        } while ($this->emailExists($candidate));

        return $candidate;
    }

    private function emailExists(string $email): bool
    {
        return Student::query()->where('email', $email)->exists()
            || User::query()->where('email', $email)->exists();
    }

    private function resolveClassForOrganization(Organization $organization, string $className, string $sectionName): ?SchoolClass
    {
        $query = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('name', $className)
            ->where('section', $sectionName)
            ->where('status', 'active');

        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        if ($activeAcademicYearId) {
            $query->where('academic_year_id', $activeAcademicYearId);
        }

        $schoolClass = $query->first();

        if ($schoolClass) {
            return $schoolClass;
        }

        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'name' => $className,
            'section' => $sectionName,
            'status' => 'active',
        ]);
    }

    private function generateAdmissionNumber(): string
    {
        $lastAdmissionNumber = Student::withTrashed()
            ->orderByDesc('id')
            ->value('admission_no');

        $lastSequence = (int) preg_replace('/\D/', '', (string) $lastAdmissionNumber);
        $nextSequence = max($lastSequence + 1, 1);

        do {
            $candidate = 'A'.str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $exists = Student::withTrashed()
                ->where('admission_no', $candidate)
                ->exists();
            $nextSequence++;
        } while ($exists);

        return $candidate;
    }

    private function isDuplicateAdmissionNumberException(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'students_admission_no_unique')
            || str_contains($message, 'Duplicate entry');
    }

    private function getStudentTableColumns(): array
    {
        if ($this->studentTableColumns !== null) {
            return $this->studentTableColumns;
        }

        $this->studentTableColumns = Schema::getColumnListing('students');

        return $this->studentTableColumns;
    }
}
