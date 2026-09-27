<?php

namespace App\Support;

class PortalFieldCatalog
{
    /**
     * Canonical mappable fields grouped by entity. Key is the value used by
     * presets and custom templates; label is shown in the UI.
     */
    public const FIELDS = [
        'school' => [
            'name' => 'School Name',
            'udise_code' => 'UDISE Code',
            'school_code' => 'School Code',
            'affiliation_no' => 'Affiliation Number',
            'board' => 'Board',
            'affiliated_year' => 'Year of Affiliation',
            'school_category' => 'School Category',
            'grades_offered' => 'Grades Offered',
            'medium_of_instruction' => 'Medium of Instruction',
            'shift_timings' => 'Shift Timings',
            'district' => 'District',
            'block' => 'Block',
            'address' => 'Address',
            'city' => 'City',
            'state' => 'State',
            'pincode' => 'Pincode',
            'email' => 'Email',
            'phone' => 'Phone',
        ],
        'student' => [
            'name_full' => 'Student Name',
            'name_caps' => 'Student Name (Capital Letters)',
            'gender' => 'Gender',
            'date_of_birth' => 'Date of Birth',
            'admission_no' => 'Admission Number',
            'register_no' => 'Register (GR) Number',
            'roll_number' => 'Roll Number',
            'class_name' => 'Class',
            'section' => 'Section',
            'category' => 'Social Category',
            'caste' => 'Caste',
            'religion' => 'Religion',
            'mother_tongue' => 'Mother Tongue',
            'aadhar' => 'Aadhaar Number',
            'udise_student_id' => 'UDISE Student ID (EID)',
            'saral_student_id' => 'SARAL Student ID',
            'father_name' => "Father's Name",
            'mother_name' => "Mother's Name",
            'guardian_name' => 'Guardian Name',
            'guardian_phone' => 'Guardian Phone',
            'phone' => 'Student Phone',
            'current_address' => 'Address',
            'city' => 'City',
            'state' => 'State',
            'pincode' => 'Pincode',
            'admission_date' => 'Admission Date',
        ],
        'staff' => [
            'name_full' => 'Staff Name',
            'name_caps' => 'Staff Name (Capital Letters)',
            'gender' => 'Gender',
            'date_of_birth' => 'Date of Birth',
            'aadhar' => 'Aadhaar Number',
            'pan' => 'PAN Number',
            'employee_id' => 'Employee ID',
            'employee_code' => 'Staff Code',
            'national_teacher_id' => 'Teacher National Code',
            'designation' => 'Designation',
            'department' => 'Department',
            'post' => 'Post',
            'qualification' => 'Qualification',
            'teaching_qualification' => 'Teaching Qualification',
            'tet_status' => 'TET Status',
            'subjects_taught' => 'Subjects Taught',
            'appointment_type' => 'Appointment Type',
            'appointment_date' => 'Appointment Date',
            'recruitment_type' => 'Recruitment Type',
            'pay_scale' => 'Pay Scale',
            'basic_pay' => 'Basic Pay',
            'government_service_join_date' => 'Govt Service Join Date',
            'experience_years' => 'Experience (Years)',
            'teacher_type' => 'Teacher Type',
            'category' => 'Social Category',
            'religion' => 'Religion',
            'mother_tongue' => 'Mother Tongue',
            'training_received' => 'Training Received',
            'joining_date' => 'Joining Date',
            'phone' => 'Phone',
            'email' => 'Email',
        ],
    ];

    public static function all(): array
    {
        return self::FIELDS;
    }

    public static function entityKeys(): array
    {
        return array_keys(self::FIELDS);
    }

    public static function fieldsFor(string $entity): array
    {
        return self::FIELDS[$entity] ?? [];
    }

    public static function keysFor(string $entity): array
    {
        return array_keys(self::fieldsFor($entity));
    }

    public static function label(string $key): string
    {
        foreach (self::FIELDS as $fields) {
            if (array_key_exists($key, $fields)) {
                return $fields[$key];
            }
        }

        return ucwords(str_replace('_', ' ', $key));
    }

    public static function labels(): array
    {
        $labels = [];

        foreach (self::FIELDS as $entity => $fields) {
            foreach ($fields as $key => $label) {
                $labels["{$entity}.{$key}"] = $label;
            }
        }

        return $labels;
    }
}