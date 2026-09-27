<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Support\PortalFieldCatalog;
use App\Support\PortalPresets;
use App\Support\RolePermissionCatalog;
use Illuminate\Support\Collection;

class PortalRecordBuilder
{
    public const LOOKUPS = ['gender_udise', 'category_udise', 'dob_dmy', 'aadhar_udise'];
    /**
     * Build portal-ready sheets for the given preset.
     *
     * @return array<int, array{name: string, entity: string, columns: array, rows: array}>
     */
    public function sheets(Organization $organization, string $presetKey, ?array $customPreset = null): array
    {
        $preset = $customPreset !== null ? $this->normalizeCustomPreset($customPreset) : PortalPresets::find($presetKey);

        if ($preset === null) {
            throw new \InvalidArgumentException("Unknown portal preset: {$presetKey}");
        }

        $students = $this->studentsFor($organization);
        $staff = $this->staffFor($organization);

        return array_map(function (array $sheet) use ($organization, $students, $staff) {
            $records = match ($sheet['entity']) {
                'school' => [$organization],
                'student' => $students->all(),
                'staff' => $staff->all(),
            };

            $columns = array_map(
                fn (array $column) => [
                    'label' => $column['label'],
                    'source' => $column['source'] ?? null,
                    'type' => $column['type'] ?? 'auto',
                    'required' => $column['required'] ?? false,
                    'lookup' => $column['lookup'] ?? null,
                    'static' => $column['static'] ?? null,
                ],
                $sheet['columns']
            );

            $rows = array_map(
                fn ($record) => $this->buildRow($record, $sheet['entity'], $columns),
                $records
            );

            return [
                'name' => $sheet['name'],
                'entity' => $sheet['entity'],
                'columns' => $columns,
                'rows' => $rows,
            ];
        }, $preset['sheets']);
    }

    private function buildRow(mixed $record, string $entity, array $columns): array
    {
        $row = [];

        foreach ($columns as $column) {
            $raw = $column['static'] !== null
                ? $column['static']
                : $this->resolveValue($record, $entity, $column['source']);

            $value = $raw === null || $raw === '' ? '' : (string) $raw;

            if ($value !== '' && ($column['lookup'] ?? null) !== null) {
                $value = $this->applyLookup((string) $column['lookup'], $value);
            }

            $row[$column['label']] = $value;
        }

        return $row;
    }

    private function resolveValue(mixed $record, string $entity, ?string $source): string|int|null
    {
        if ($source === null) {
            return null;
        }

        [$scope, $field] = array_pad(explode('.', $source, 2), 2, null);

        if ($scope !== $entity || $field === null) {
            return null;
        }

        return match ($entity) {
            'school' => $this->schoolValue($record, $field),
            'student' => $this->studentValue($record, $field),
            'staff' => $this->staffValue($record, $field),
            default => null,
        };
    }

    private function schoolValue(Organization $organization, string $field): string|int|null
    {
        $profile = is_array($organization->settings['compliance_profile'] ?? null)
            ? $organization->settings['compliance_profile']
            : [];

        return match ($field) {
            'name' => $organization->name,
            'udise_code' => $organization->settings['portal_records']['udise_code'] ?? trim((string) ($profile['udise_code'] ?? '')),
            'address', 'city', 'state', 'pincode' => $organization->{$field},
            'district', 'block' => $profile[$field] ?? '',
            'email' => $organization->email,
            'phone' => $organization->phone,
            'affiliation_no', 'board', 'affiliated_year', 'school_category', 'grades_offered', 'medium_of_instruction', 'shift_timings' => $profile[$field] ?? '',
            default => null,
        };
    }

    private function studentValue(Student $student, string $field): string|int|null
    {
        return match ($field) {
            'name_full' => self::cleanName(trim($student->first_name.' '.($student->middle_name ?? '').' '.($student->last_name ?? ''))),
            'name_caps' => strtoupper(self::cleanName(trim($student->first_name.' '.($student->middle_name ?? '').' '.($student->last_name ?? '')))),
            'gender' => $student->gender,
            'date_of_birth' => $student->date_of_birth?->toDateString(),
            'admission_no' => $student->admission_no,
            'register_no' => $student->register_no,
            'roll_number' => $student->roll_number,
            'class_name' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->section,
            'category' => $student->category,
            'caste' => $student->caste,
            'religion' => $student->religion,
            'mother_tongue' => $student->mother_tongue,
            'aadhar' => preg_replace('/\s+/', '', (string) ($student->aadhar_number ?? '')),
            'udise_student_id' => $student->udise_student_id,
            'saral_student_id' => $student->saral_student_id,
            'father_name' => $student->father_name,
            'mother_name' => $student->mother_name,
            'guardian_name' => $student->guardian_name ?: $student->father_name,
            'guardian_phone' => $student->guardian_phone ?: $student->father_phone,
            'phone' => $student->phone,
            'current_address' => trim(implode(', ', array_filter([$student->current_address, $student->city, $student->state]))),
            'city' => $student->city,
            'state' => $student->state,
            'pincode' => $student->pincode,
            'admission_date' => $student->admission_date?->toDateString(),
            default => null,
        };
    }

    private function staffValue(User $user, string $field): string|int|null
    {
        $profile = $user->relationLoaded('profile') ? $user->profile : $user->profile;

        return match ($field) {
            'name_full' => trim($user->name),
            'name_caps' => strtoupper(trim((string) $user->name)),
            'gender' => $user->gender,
            'date_of_birth' => $user->date_of_birth?->toDateString(),
            'aadhar' => preg_replace('/\s+/', '', (string) ($profile?->aadhar_number ?? '')),
            'pan' => $profile?->pan,
            'employee_id' => $user->employee_id,
            'employee_code' => $profile?->employee_code,
            'national_teacher_id' => $profile?->national_teacher_id,
            'designation' => $user->designation?->name,
            'department' => $user->department?->name,
            'post' => $profile?->post,
            'qualification' => $profile?->qualification,
            'teaching_qualification' => $profile?->teaching_qualification,
            'tet_status' => $profile?->tet_status,
            'subjects_taught' => is_array($profile?->subjects_taught) ? implode(', ', $profile->subjects_taught) : null,
            'appointment_type' => $profile?->appointment_type,
            'appointment_date' => $profile?->appointment_date?->toDateString(),
            'recruitment_type' => $profile?->recruitment_type,
            'pay_scale' => $profile?->pay_scale,
            'basic_pay' => $profile?->basic_pay,
            'government_service_join_date' => $profile?->government_service_join_date?->toDateString(),
            'experience_years' => $profile?->experience_years,
            'teacher_type' => $profile?->teacher_type,
            'category' => $profile?->category,
            'religion' => $profile?->religion,
            'mother_tongue' => $profile?->mother_tongue,
            'training_received' => $profile?->training_received !== null ? ($profile->training_received ? 'Yes' : 'No') : null,
            'joining_date' => $user->joining_date?->toDateString(),
            'phone' => $user->phone,
            'email' => $user->email,
            default => null,
        };
    }

    private function applyLookup(string $lookup, string $value): string
    {
        return match ($lookup) {
            'gender_udise' => match (strtolower($value)) {
                'male' => '1',
                'female' => '2',
                'other', 'transgender' => '3',
                default => $value,
            },
            'category_udise' => match (strtoupper(trim($value))) {
                'GENERAL' => '1',
                'OC', 'OPEN' => '1',
                'SC' => '2',
                'ST' => '3',
                'OBC', 'OBC A' => '4',
                'OBC B' => '5',
                default => $value,
            },
            'dob_dmy' => $this->formatDmy($value),
            'aadhar_udise' => $value === '' || strlen(preg_replace('/\D+/', '', $value)) !== 12
                ? '999999999999'
                : $value,
            default => $value,
        };
    }

    private static function cleanName(string $value): string
    {
        return trim((string) preg_replace('/\s+/', ' ', $value));
    }

    private function formatDmy(string $value): string
    {
        foreach (['Y-m-d', 'd-m-Y', 'd/m/Y', 'Y/m/d'] as $format) {
            $parsed = \DateTime::createFromFormat($format, $value);
            if ($parsed && $parsed->format($format) === $value) {
                return $parsed->format('d/m/Y');
            }
        }

        if (strtotime($value) !== false) {
            return date('d/m/Y', strtotime($value));
        }

        return $value;
    }

    private function studentsFor(Organization $organization): Collection
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,organization_id,academic_year_id,name,section')
            ->orderBy('first_name')
            ->get();
    }

    private function staffFor(Organization $organization): Collection
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', RolePermissionCatalog::staffRoleSlugs())
            ->with(['profile:id,organization_id,user_id,aadhar_number,pan,national_teacher_id,employee_code,appointment_date,appointment_type,recruitment_type,post,pay_scale,basic_pay,government_service_join_date,qualification,teaching_qualification,tet_status,mother_tongue,religion,category,subjects_taught,experience_years,training_received,teacher_type', 'designation:id,name', 'department:id,name'])
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();
    }

    private function normalizeCustomPreset(array $preset): array
    {
        return [
            'label' => $preset['label'] ?? 'Custom',
            'state' => null,
            'description' => $preset['description'] ?? '',
            'sheets' => $preset['sheets'] ?? [],
        ];
    }

    /**
     * @return array<string, string>|null field label => field key for custom templates
     */
    public function fieldOptions(string $entity): array
    {
        $options = [];

        foreach (PortalFieldCatalog::fieldsFor($entity) as $key => $label) {
            $options["{$entity}.{$key}"] = $label;
        }

        return $options;
    }
}