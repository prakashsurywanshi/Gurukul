<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Designation;
use App\Models\Organization;
use App\Models\User;
use App\Support\RolePermissionCatalog;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class StaffImportService
{
    public function import(array $userRows, Organization $organization): array
    {
        $createdCount = 0;
        $errors = [];

        foreach ($userRows as $index => $userInput) {
            try {
                $userData = is_array($userInput) ? $userInput : [];
                $validatedUser = $this->validateUserPayload($userData);

                try {
                    DB::transaction(function () use ($validatedUser, $organization) {
                        $staff = User::query()->create([
                            'organization_id' => $organization->id,
                            'name' => $validatedUser['name'],
                            'email' => $validatedUser['email'],
                            'password' => $validatedUser['password'] ?? Str::random(16),
                            'phone' => $validatedUser['phone'] ?? null,
                            'address' => $validatedUser['address'] ?? null,
                            'role' => $validatedUser['role'],
                            'status' => $validatedUser['status'] ?? 'active',
                            'employee_id' => $validatedUser['employee_id'] ?? null,
                            'designation_id' => $this->resolveDesignationId($organization, $validatedUser['designation'] ?? null),
                            'department_id' => $this->resolveDepartmentId($organization, $validatedUser['department'] ?? null),
                            'date_of_birth' => $validatedUser['date_of_birth'] ?? null,
                            'gender' => $validatedUser['gender'] ?? null,
                            'joining_date' => $validatedUser['joining_date'] ?? null,
                            'blood_group' => $validatedUser['blood_group'] ?? null,
                        ]);

                        $this->createStaffProfile($staff, $validatedUser);
                    });
                    $createdCount++;
                } catch (QueryException $exception) {
                    report($exception);

                    $errors[] = 'Row '.($index + 1).': This staff member could not be imported because of a database error.';
                }
            } catch (ValidationException $exception) {
                $messages = collect($exception->errors())->flatten()->implode(' ');
                $errors[] = 'Row '.($index + 1).': '.$messages;
            } catch (Throwable $exception) {
                report($exception);

                $errors[] = 'Row '.($index + 1).': This staff member could not be imported.';
            }
        }

        return [
            'created_count' => $createdCount,
            'error_count' => count($errors),
            'errors' => $errors,
        ];
    }

    private function validateUserPayload(array $payload): array
    {
        $roleSlug = Str::lower(trim((string) ($payload['role'] ?? '')));
        $roleSlug = RolePermissionCatalog::slugForDisplayName($payload['role'] ?? '') ?? $roleSlug;
        $payload['role'] = $roleSlug;

        return validator($payload, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'role' => ['required', Rule::in(['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'librarian', 'driver', 'transport_manager'])],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'employee_id' => ['nullable', 'string', 'max:50'],
            'designation' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'joining_date' => ['nullable', 'date'],
            'blood_group' => ['nullable', 'string', 'max:20'],
            'aadhar_number' => ['nullable', 'string', 'max:20'],
            'pan' => ['nullable', 'string', 'max:20'],
            'national_teacher_id' => ['nullable', 'string', 'max:50'],
            'employee_code' => ['nullable', 'string', 'max:50'],
            'appointment_date' => ['nullable', 'date'],
            'appointment_type' => ['nullable', 'string', 'max:100'],
            'recruitment_type' => ['nullable', 'string', 'max:100'],
            'post' => ['nullable', 'string', 'max:200'],
            'pay_scale' => ['nullable', 'string', 'max:100'],
            'basic_pay' => ['nullable', 'numeric'],
            'government_service_join_date' => ['nullable', 'date'],
            'qualification' => ['nullable', 'string', 'max:300'],
            'teaching_qualification' => ['nullable', 'string', 'max:300'],
            'tet_status' => ['nullable', 'string', 'max:100'],
            'mother_tongue' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'subjects_taught' => ['nullable', 'array'],
            'subjects_taught.*' => ['nullable', 'string', 'max:100'],
            'experience_years' => ['nullable', 'numeric', 'min:0'],
            'training_received' => ['nullable', 'boolean'],
            'teacher_type' => ['nullable', 'string', 'max:100'],
        ])->validate();
    }

    private function createStaffProfile(User $staff, array $validated): void
    {
        $hasProfileFields = collect([
            'aadhar_number', 'pan', 'national_teacher_id', 'employee_code', 'appointment_date', 'appointment_type',
            'recruitment_type', 'post', 'pay_scale', 'basic_pay', 'government_service_join_date', 'qualification',
            'teaching_qualification', 'tet_status', 'mother_tongue', 'religion', 'category', 'subjects_taught',
            'experience_years', 'training_received', 'teacher_type',
        ])->contains(fn (string $key) => !empty($validated[$key] ?? null));

        if (! $hasProfileFields) {
            return;
        }

        $subjects = $validated['subjects_taught'] ?? null;

        $staff->profile()->create([
            'organization_id' => $staff->organization_id,
            'aadhar_number' => $validated['aadhar_number'] ?? null,
            'pan' => $validated['pan'] ?? null,
            'national_teacher_id' => $validated['national_teacher_id'] ?? null,
            'employee_code' => $validated['employee_code'] ?? null,
            'appointment_date' => $validated['appointment_date'] ?? null,
            'appointment_type' => $validated['appointment_type'] ?? null,
            'recruitment_type' => $validated['recruitment_type'] ?? null,
            'post' => $validated['post'] ?? null,
            'pay_scale' => $validated['pay_scale'] ?? null,
            'basic_pay' => $validated['basic_pay'] ?? null,
            'government_service_join_date' => $validated['government_service_join_date'] ?? null,
            'qualification' => $validated['qualification'] ?? null,
            'teaching_qualification' => $validated['teaching_qualification'] ?? null,
            'tet_status' => $validated['tet_status'] ?? null,
            'mother_tongue' => $validated['mother_tongue'] ?? null,
            'religion' => $validated['religion'] ?? null,
            'category' => $validated['category'] ?? null,
            'subjects_taught' => is_array($subjects) ? array_values($subjects) : null,
            'experience_years' => $validated['experience_years'] ?? null,
            'training_received' => $this->normalizeTrainingReceived($validated['training_received'] ?? null),
            'teacher_type' => $validated['teacher_type'] ?? null,
        ]);
    }

    private function normalizeTrainingReceived(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value)) {
            return $value !== 0;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function resolveDesignationId(Organization $organization, ?string $name): ?int
    {
        if (!$name) {
            return null;
        }

        return Designation::query()
            ->where('organization_id', $organization->id)
            ->where('name', $name)
            ->value('id');
    }

    private function resolveDepartmentId(Organization $organization, ?string $name): ?int
    {
        if (!$name) {
            return null;
        }

        return Department::query()
            ->where('organization_id', $organization->id)
            ->where('name', $name)
            ->value('id');
    }
}