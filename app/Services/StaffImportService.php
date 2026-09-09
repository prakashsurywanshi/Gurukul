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
                        User::query()->create([
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
            'role' => ['required', Rule::in(['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'librarian', 'driver'])],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'employee_id' => ['nullable', 'string', 'max:50'],
            'designation' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'joining_date' => ['nullable', 'date'],
            'blood_group' => ['nullable', 'string', 'max:20'],
        ])->validate();
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