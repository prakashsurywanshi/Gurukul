<?php

namespace App\Support;

class PortalPresets
{
    /**
     * Available states and the presets available to them.
     */
    public const STATES = [
        'maharashtra' => 'Maharashtra',
    ];

    /**
     * Built-in preset definitions. Column source keys reference
     * PortalFieldCatalog fields. Lookups are transform names resolved by
     * PortalRecordBuilder (e.g. gender_udise, category_udise, dob_dmy).
     */
    public const PRESETS = [
        'udiseplus' => [
            'label' => 'UDISE+ (National)',
            'state' => null,
            'description' => 'Annual Data Capture Format for UDISE+ portal.',
            'sheets' => [
                [
                    'name' => 'School Profile',
                    'entity' => 'school',
                    'columns' => [
                        ['label' => 'UDISE Code', 'source' => 'school.udise_code', 'required' => true],
                        ['label' => 'School Name', 'source' => 'school.name', 'required' => true],
                        ['label' => 'School Category', 'source' => 'school.school_category'],
                        ['label' => 'Medium of Instruction', 'source' => 'school.medium_of_instruction'],
                        ['label' => 'Board', 'source' => 'school.board'],
                        ['label' => 'Affiliation Number', 'source' => 'school.affiliation_no'],
                        ['label' => 'Grades Offered', 'source' => 'school.grades_offered'],
                        ['label' => 'District', 'source' => 'school.district'],
                        ['label' => 'Block', 'source' => 'school.block'],
                        ['label' => 'Address', 'source' => 'school.address'],
                        ['label' => 'State', 'source' => 'school.state'],
                        ['label' => 'Pincode', 'source' => 'school.pincode', 'type' => 'text'],
                    ],
                ],
                [
                    'name' => 'Staff',
                    'entity' => 'staff',
                    'columns' => [
                        ['label' => 'Teacher National Code', 'source' => 'staff.national_teacher_id'],
                        ['label' => 'Name', 'source' => 'staff.name_caps', 'required' => true],
                        ['label' => 'Gender', 'source' => 'staff.gender', 'lookup' => 'gender_udise', 'required' => true],
                        ['label' => 'Date of Birth', 'source' => 'staff.date_of_birth', 'lookup' => 'dob_dmy'],
                        ['label' => 'Social Category', 'source' => 'staff.category', 'lookup' => 'category_udise'],
                        ['label' => 'Aadhaar Number', 'source' => 'staff.aadhar', 'type' => 'text'],
                        ['label' => 'Qualification', 'source' => 'staff.qualification'],
                        ['label' => 'Appointment Type', 'source' => 'staff.appointment_type'],
                        ['label' => 'Subjects Taught', 'source' => 'staff.subjects_taught'],
                        ['label' => 'Designation', 'source' => 'staff.designation'],
                    ],
                ],
                [
                    'name' => 'Students',
                    'entity' => 'student',
                    'columns' => [
                        ['label' => 'UDISE Student ID (EID)', 'source' => 'student.udise_student_id', 'type' => 'text'],
                        ['label' => 'Name', 'source' => 'student.name_caps', 'required' => true],
                        ['label' => 'Gender', 'source' => 'student.gender', 'lookup' => 'gender_udise', 'required' => true],
                        ['label' => 'Date of Birth', 'source' => 'student.date_of_birth', 'lookup' => 'dob_dmy'],
                        ['label' => 'Class', 'source' => 'student.class_name'],
                        ['label' => 'Section', 'source' => 'student.section'],
                        ['label' => 'Social Category', 'source' => 'student.category', 'lookup' => 'category_udise'],
                        ['label' => 'Religion', 'source' => 'student.religion'],
                        ['label' => 'Mother Tongue', 'source' => 'student.mother_tongue'],
                        ['label' => 'Aadhaar Number', 'source' => 'student.aadhar', 'type' => 'text'],
                        ['label' => 'Father Name', 'source' => 'student.father_name'],
                        ['label' => 'Mother Name', 'source' => 'student.mother_name'],
                        ['label' => 'Address', 'source' => 'student.current_address'],
                        ['label' => 'Pincode', 'source' => 'student.pincode', 'type' => 'text'],
                    ],
                ],
            ],
        ],
        'saral-maharashtra' => [
            'label' => 'SARAL (Maharashtra)',
            'state' => 'maharashtra',
            'description' => 'Maharashtra SARAL Education Portal - Student, School and Staff records.',
            'sheets' => [
                [
                    'name' => 'SARAL Students',
                    'entity' => 'student',
                    'columns' => [
                        ['label' => 'SARAL Student ID', 'source' => 'student.saral_student_id', 'type' => 'text'],
                        ['label' => 'Register No (GR)', 'source' => 'student.register_no', 'type' => 'text'],
                        ['label' => 'Name', 'source' => 'student.name_full', 'required' => true],
                        ['label' => 'Gender', 'source' => 'student.gender', 'required' => true],
                        ['label' => 'Date of Birth', 'source' => 'student.date_of_birth', 'lookup' => 'dob_dmy'],
                        ['label' => 'Class', 'source' => 'student.class_name'],
                        ['label' => 'Section', 'source' => 'student.section'],
                        ['label' => 'Caste', 'source' => 'student.caste'],
                        ['label' => 'Category', 'source' => 'student.category'],
                        ['label' => 'Religion', 'source' => 'student.religion'],
                        ['label' => 'Mother Tongue', 'source' => 'student.mother_tongue'],
                        ['label' => 'Aadhaar Number', 'source' => 'student.aadhar', 'type' => 'text', 'required' => true],
                        ['label' => 'Father Name', 'source' => 'student.father_name'],
                        ['label' => 'Mother Name', 'source' => 'student.mother_name'],
                        ['label' => 'Address', 'source' => 'student.current_address'],
                    ],
                ],
                [
                    'name' => 'SARAL School',
                    'entity' => 'school',
                    'columns' => [
                        ['label' => 'School Name', 'source' => 'school.name', 'required' => true],
                        ['label' => 'UDISE Code', 'source' => 'school.udise_code', 'required' => true],
                        ['label' => 'Address', 'source' => 'school.address'],
                        ['label' => 'City', 'source' => 'school.city'],
                        ['label' => 'State', 'source' => 'school.state'],
                        ['label' => 'Pincode', 'source' => 'school.pincode', 'type' => 'text'],
                        ['label' => 'Board', 'source' => 'school.board'],
                        ['label' => 'Medium of Instruction', 'source' => 'school.medium_of_instruction'],
                        ['label' => 'School Category', 'source' => 'school.school_category'],
                    ],
                ],
                [
                    'name' => 'SARAL Staff',
                    'entity' => 'staff',
                    'columns' => [
                        ['label' => 'Staff Code', 'source' => 'staff.employee_code', 'type' => 'text'],
                        ['label' => 'Name', 'source' => 'staff.name_full', 'required' => true],
                        ['label' => 'Gender', 'source' => 'staff.gender', 'required' => true],
                        ['label' => 'Date of Birth', 'source' => 'staff.date_of_birth', 'lookup' => 'dob_dmy'],
                        ['label' => 'Designation', 'source' => 'staff.designation'],
                        ['label' => 'Post', 'source' => 'staff.post'],
                        ['label' => 'Qualification', 'source' => 'staff.qualification'],
                        ['label' => 'Teaching Qualification', 'source' => 'staff.teaching_qualification'],
                        ['label' => 'TET Status', 'source' => 'staff.tet_status'],
                        ['label' => 'Appointment Type', 'source' => 'staff.appointment_type'],
                        ['label' => 'Appointment Date', 'source' => 'staff.appointment_date', 'lookup' => 'dob_dmy'],
                        ['label' => 'Recruitment Type', 'source' => 'staff.recruitment_type'],
                        ['label' => 'Pay Scale', 'source' => 'staff.pay_scale'],
                        ['label' => 'Basic Pay', 'source' => 'staff.basic_pay'],
                        ['label' => 'Aadhaar Number', 'source' => 'staff.aadhar', 'type' => 'text'],
                        ['label' => 'PAN', 'source' => 'staff.pan'],
                        ['label' => 'Subjects Taught', 'source' => 'staff.subjects_taught'],
                        ['label' => 'Experience (Years)', 'source' => 'staff.experience_years'],
                    ],
                ],
            ],
        ],
        'generic' => [
            'label' => 'Generic (Any State)',
            'state' => null,
            'description' => 'Common columns usable as a starting point for any state portal.',
            'sheets' => [
                [
                    'name' => 'School',
                    'entity' => 'school',
                    'columns' => [
                        ['label' => 'School Name', 'source' => 'school.name', 'required' => true],
                        ['label' => 'UDISE Code', 'source' => 'school.udise_code'],
                        ['label' => 'Medium of Instruction', 'source' => 'school.medium_of_instruction'],
                        ['label' => 'Address', 'source' => 'school.address'],
                        ['label' => 'City', 'source' => 'school.city'],
                        ['label' => 'State', 'source' => 'school.state'],
                        ['label' => 'Pincode', 'source' => 'school.pincode', 'type' => 'text'],
                    ],
                ],
                [
                    'name' => 'Students',
                    'entity' => 'student',
                    'columns' => [
                        ['label' => 'Admission No', 'source' => 'student.admission_no', 'type' => 'text'],
                        ['label' => 'Name', 'source' => 'student.name_full', 'required' => true],
                        ['label' => 'Gender', 'source' => 'student.gender', 'required' => true],
                        ['label' => 'Date of Birth', 'source' => 'student.date_of_birth', 'lookup' => 'dob_dmy'],
                        ['label' => 'Class', 'source' => 'student.class_name'],
                        ['label' => 'Section', 'source' => 'student.section'],
                        ['label' => 'Category', 'source' => 'student.category'],
                        ['label' => 'Father Name', 'source' => 'student.father_name'],
                        ['label' => 'Mother Name', 'source' => 'student.mother_name'],
                        ['label' => 'Aadhaar Number', 'source' => 'student.aadhar', 'type' => 'text'],
                        ['label' => 'Address', 'source' => 'student.current_address'],
                        ['label' => 'Pincode', 'source' => 'student.pincode', 'type' => 'text'],
                    ],
                ],
                [
                    'name' => 'Staff',
                    'entity' => 'staff',
                    'columns' => [
                        ['label' => 'Employee ID', 'source' => 'staff.employee_id', 'type' => 'text'],
                        ['label' => 'Name', 'source' => 'staff.name_full', 'required' => true],
                        ['label' => 'Gender', 'source' => 'staff.gender', 'required' => true],
                        ['label' => 'Date of Birth', 'source' => 'staff.date_of_birth', 'lookup' => 'dob_dmy'],
                        ['label' => 'Designation', 'source' => 'staff.designation'],
                        ['label' => 'Qualification', 'source' => 'staff.qualification'],
                        ['label' => 'Appointment Type', 'source' => 'staff.appointment_type'],
                        ['label' => 'Aadhaar Number', 'source' => 'staff.aadhar', 'type' => 'text'],
                    ],
                ],
            ],
        ],
    ];

    public static function states(): array
    {
        return self::STATES;
    }

    public static function presetsForState(?string $state): array
    {
        return collect(self::PRESETS)
            ->filter(fn (array $preset) => $preset['state'] === null || $preset['state'] === $state)
            ->map(fn (array $preset, string $key) => [
                'key' => $key,
                'label' => $preset['label'],
                'description' => $preset['description'],
                'sheets' => array_map(fn (array $sheet) => [
                    'name' => $sheet['name'],
                    'entity' => $sheet['entity'],
                    'columns' => $sheet['columns'],
                ], $preset['sheets']),
            ])
            ->values()
            ->all();
    }

    public static function presets(): array
    {
        return self::PRESETS;
    }

    public static function find(string $key): ?array
    {
        return self::PRESETS[$key] ?? null;
    }
}