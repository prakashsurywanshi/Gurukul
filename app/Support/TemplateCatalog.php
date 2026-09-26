<?php

namespace App\Support;

/**
 * Single source of truth for the unified template store: gallery categories,
 * assignable print slots, designer placeholder palette and card-size presets.
 */
class TemplateCatalog
{
    /**
     * Gallery categories displayed as filter chips. First entry is "All".
     *
     * @return array<int, array{key: string, label: string}>
     */
    public static function categories(): array
    {
        return [
            ['key' => 'academic', 'label' => 'Academic'],
            ['key' => 'admit_card', 'label' => 'Admit Card'],
            ['key' => 'bonafide', 'label' => 'Bonafide'],
            ['key' => 'certificate', 'label' => 'Certificate'],
            ['key' => 'character_certificate', 'label' => 'Character Certificate'],
            ['key' => 'fee_receipt', 'label' => 'Fee Receipt'],
            ['key' => 'general', 'label' => 'General'],
            ['key' => 'id_card', 'label' => 'Id Card'],
            ['key' => 'interactive', 'label' => 'Interactive'],
            ['key' => 'marksheet', 'label' => 'Marksheet'],
            ['key' => 'staff_id_card', 'label' => 'Staff Id Card'],
            ['key' => 'transfer_certificate', 'label' => 'Transfer Certificate'],
            // Dedicated categories for the assignable print slots beyond the demo set.
            ['key' => 'report_card', 'label' => 'Report Card'],
            ['key' => 'hall_ticket', 'label' => 'Hall Ticket'],
            ['key' => 'fee_challan', 'label' => 'Fee Challan'],
            ['key' => 'due_slip', 'label' => 'Due Slip'],
            ['key' => 'payslip', 'label' => 'Payslip'],
            ['key' => 'hpc', 'label' => 'HPC Progress Card'],
            ['key' => 'tc', 'label' => 'Transfer Certificate (TC)'],
            ['key' => 'school_report', 'label' => 'School Report'],
        ];
    }

    /**
     * Assignable print slots. Each maps to a primary gallery category and a
     * renderer strategy.
     *
     * @return array<int, array{key: string, label: string, category: string, renderer: string, module: string, description: string}>
     */
    public static function slots(): array
    {
        return [
            ['key' => 'student-id-card', 'label' => 'Student ID Card', 'category' => 'id_card', 'renderer' => 'react', 'module' => 'Certificates', 'description' => 'Student identity card design used on the ID card page and QR verification.'],
            ['key' => 'staff-id-card', 'label' => 'Staff ID Card', 'category' => 'staff_id_card', 'renderer' => 'react', 'module' => 'Certificates', 'description' => 'Staff identity card design used on the staff ID card page.'],
            ['key' => 'report-card', 'label' => 'Report Card', 'category' => 'report_card', 'renderer' => 'react', 'module' => 'Exams', 'description' => 'Report card header, colours and layout used by the report card print.'],
            ['key' => 'hpc', 'label' => 'HPC Progress Card', 'category' => 'hpc', 'renderer' => 'react', 'module' => 'Exams', 'description' => 'Holistic progress card appearance.'],
            ['key' => 'certificate', 'label' => 'Certificate Grid', 'category' => 'certificate', 'renderer' => 'server', 'module' => 'Certificates', 'description' => 'Default certificate design pre-selected when generating certificates and documents.'],
            ['key' => 'hall-ticket', 'label' => 'Hall Ticket', 'category' => 'hall_ticket', 'renderer' => 'server', 'module' => 'Exams', 'description' => 'Exam hall ticket / admit card printable.'],
            ['key' => 'marksheet', 'label' => 'Marksheet', 'category' => 'marksheet', 'renderer' => 'server', 'module' => 'Exams', 'description' => 'Marksheet printable shared by the print marksheet workflow.'],
            ['key' => 'fee-challan', 'label' => 'Fee Challan', 'category' => 'fee_challan', 'renderer' => 'blade', 'module' => 'Fees', 'description' => 'Fee challan PDF layout.'],
            ['key' => 'fee-due-slip', 'label' => 'Fee Due Slip', 'category' => 'due_slip', 'renderer' => 'blade', 'module' => 'Fees', 'description' => 'Fee due slip printable.'],
            ['key' => 'payslip', 'label' => 'Payslip', 'category' => 'payslip', 'renderer' => 'blade', 'module' => 'Staff', 'description' => 'Staff payroll slip PDF layout.'],
            ['key' => 'tc', 'label' => 'Transfer Certificate', 'category' => 'tc', 'renderer' => 'server', 'module' => 'Student Information', 'description' => 'Transfer certificate default design.'],
            ['key' => 'school-report', 'label' => 'School Report', 'category' => 'school_report', 'renderer' => 'blade', 'module' => 'Reports', 'description' => 'School reports PDF header and branding.'],
        ];
    }

    /**
     * @return array<string, array{key: string, label: string, category: string, renderer: string, module: string, description: string}>
     */
    public static function slotsKeyed(): array
    {
        $keyed = [];
        foreach (self::slots() as $slot) {
            $keyed[$slot['key']] = $slot;
        }

        return $keyed;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public static function slotCategoryKeys(): array
    {
        $map = [];
        foreach (self::slots() as $slot) {
            $map[$slot['key']] = [$slot['category']];
        }

        return $map;
    }

    public static function slotKeys(): array
    {
        return array_column(self::slots(), 'key');
    }

    public static function categoryKeys(): array
    {
        return array_column(self::categories(), 'key');
    }

    public static function editorTypes(): array
    {
        return ['legacy', 'fabric', 'flow'];
    }

    /**
     * Card size presets (mm) supported by the Canvas Designer.
     *
     * @return array<string, array<int, float>>
     */
    public static function cardSizePresets(): array
    {
        return [
            'cr80_portrait' => [54.0, 85.6],
            'cr80_landscape' => [85.6, 54.0],
            'a7_portrait' => [74.0, 105.0],
            'a7_landscape' => [105.0, 74.0],
            'a6_portrait' => [105.0, 148.0],
            'a6_landscape' => [148.0, 105.0],
            'a5_portrait' => [148.0, 210.0],
            'a5_landscape' => [210.0, 148.0],
            'a4_portrait' => [210.0, 297.0],
            'a4_landscape' => [297.0, 210.0],
            'a3_portrait' => [297.0, 420.0],
            'a3_landscape' => [420.0, 297.0],
            'custom' => null,
        ];
    }

    /**
     * Placeholder palette exposed to the Canvas Designer. `kind` is 'text',
     * 'image' or 'table' (fills with an HTML table at print time); `token` is
     * the printable token substituted by the renderer; `availability` is a hint
     * for the designer UI about the context that supplies the value:
     * 'always' (student/school default context), 'exam', 'result', 'fee',
     * 'doc' (filled only when generating a document).
     *
     * @return array<int, array{group: string, items: array<int, array{tag: string, label: string, kind: string, token: string, standin?: string, w?: int, availability: string}>}>
     */
    public static function placeholderGroups(): array
    {
        return [
            [
                'group' => 'Images & Signatures',
                'items' => [
                    ['tag' => 'student_photo_url', 'label' => 'Student Photo', 'kind' => 'image', 'token' => '{{student_photo_url}}', 'standin' => 'avatar', 'w' => 20, 'availability' => 'always'],
                    ['tag' => 'staff_photo_url', 'label' => 'Staff Photo', 'kind' => 'image', 'token' => '{{staff_photo_url}}', 'standin' => 'avatar', 'w' => 20, 'availability' => 'always'],
                    ['tag' => 'school_logo_url', 'label' => 'School Logo', 'kind' => 'image', 'token' => '{{school_logo_url}}', 'standin' => 'logo', 'w' => 14, 'availability' => 'always'],
                    ['tag' => 'qr_code_url', 'label' => 'Verify QR', 'kind' => 'image', 'token' => '{{qr_code_url}}', 'standin' => 'qr', 'w' => 15, 'availability' => 'always'],
                    ['tag' => 'secure_attendance_qr', 'label' => 'Attendance QR', 'kind' => 'image', 'token' => '{{secure_attendance_qr}}', 'standin' => 'qr', 'w' => 15, 'availability' => 'always'],
                    ['tag' => 'principal_signature_url', 'label' => 'Principal Signature', 'kind' => 'image', 'token' => '{{principal_signature_url}}', 'standin' => 'logo', 'w' => 16, 'availability' => 'always'],
                    ['tag' => 'class_teacher_signature', 'label' => 'Class Teacher Signature', 'kind' => 'image', 'token' => '{{class_teacher_signature}}', 'standin' => 'logo', 'w' => 16, 'availability' => 'always'],
                    ['tag' => 'staff_signature', 'label' => 'Staff Signature', 'kind' => 'image', 'token' => '{{staff_signature}}', 'standin' => 'logo', 'w' => 16, 'availability' => 'always'],
                    ['tag' => 'barcode_url', 'label' => 'Barcode', 'kind' => 'image', 'token' => '{{barcode_url}}', 'standin' => 'qr', 'w' => 18, 'availability' => 'always'],
                    ['tag' => 'admit_card_qr', 'label' => 'Admit-card QR', 'kind' => 'image', 'token' => '{{admit_card_qr}}', 'standin' => 'qr', 'w' => 15, 'availability' => 'exam'],
                    ['tag' => 'qr_code', 'label' => 'Generic QR', 'kind' => 'image', 'token' => '{{qr_code}}', 'standin' => 'qr', 'w' => 15, 'availability' => 'doc'],
                ],
            ],
            [
                'group' => 'Student',
                'items' => [
                    ['tag' => 'student_name', 'label' => 'Student Name', 'kind' => 'text', 'token' => '{{student_name}}', 'availability' => 'always'],
                    ['tag' => 'first_name', 'label' => 'First Name', 'kind' => 'text', 'token' => '{{first_name}}', 'availability' => 'always'],
                    ['tag' => 'last_name', 'label' => 'Last Name', 'kind' => 'text', 'token' => '{{last_name}}', 'availability' => 'always'],
                    ['tag' => 'admission_no', 'label' => 'Admission No.', 'kind' => 'text', 'token' => '{{admission_no}}', 'availability' => 'always'],
                    ['tag' => 'roll_no', 'label' => 'Roll No.', 'kind' => 'text', 'token' => '{{roll_no}}', 'availability' => 'always'],
                    ['tag' => 'class_section', 'label' => 'Class & Section', 'kind' => 'text', 'token' => '{{class_section}}', 'availability' => 'always'],
                    ['tag' => 'class', 'label' => 'Class', 'kind' => 'text', 'token' => '{{class}}', 'availability' => 'always'],
                    ['tag' => 'section', 'label' => 'Section', 'kind' => 'text', 'token' => '{{section}}', 'availability' => 'always'],
                    ['tag' => 'class_name', 'label' => 'Class Name', 'kind' => 'text', 'token' => '{{class_name}}', 'availability' => 'always'],
                    ['tag' => 'section_name', 'label' => 'Section Name', 'kind' => 'text', 'token' => '{{section_name}}', 'availability' => 'always'],
                    ['tag' => 'dob', 'label' => 'Date of Birth', 'kind' => 'text', 'token' => '{{dob}}', 'availability' => 'always'],
                    ['tag' => 'blood_group', 'label' => 'Blood Group', 'kind' => 'text', 'token' => '{{blood_group}}', 'availability' => 'always'],
                    ['tag' => 'house', 'label' => 'House', 'kind' => 'text', 'token' => '{{house}}', 'availability' => 'always'],
                    ['tag' => 'gender', 'label' => 'Gender', 'kind' => 'text', 'token' => '{{gender}}', 'availability' => 'always'],
                    ['tag' => 'admission_date', 'label' => 'Admission Date', 'kind' => 'text', 'token' => '{{admission_date}}', 'availability' => 'always'],
                    ['tag' => 'date_of_joining', 'label' => 'Date of Joining', 'kind' => 'text', 'token' => '{{date_of_joining}}', 'availability' => 'always'],
                    ['tag' => 'academic_session', 'label' => 'Academic Session', 'kind' => 'text', 'token' => '{{academic_session}}', 'availability' => 'always'],
                    ['tag' => 'academic_year', 'label' => 'Academic Year', 'kind' => 'text', 'token' => '{{academic_year}}', 'availability' => 'always'],
                    ['tag' => 'class_teacher_name', 'label' => 'Class Teacher Name', 'kind' => 'text', 'token' => '{{class_teacher_name}}', 'availability' => 'always'],
                    ['tag' => 'class_teacher_designation', 'label' => 'Class Teacher Desig.', 'kind' => 'text', 'token' => '{{class_teacher_designation}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'Guardian & Contact',
                'items' => [
                    ['tag' => 'father_name', 'label' => "Father's Name", 'kind' => 'text', 'token' => '{{father_name}}', 'availability' => 'always'],
                    ['tag' => 'mother_name', 'label' => "Mother's Name", 'kind' => 'text', 'token' => '{{mother_name}}', 'availability' => 'always'],
                    ['tag' => 'guardian_name', 'label' => 'Guardian Name', 'kind' => 'text', 'token' => '{{guardian_name}}', 'availability' => 'always'],
                    ['tag' => 'guardian_phone', 'label' => 'Guardian Phone', 'kind' => 'text', 'token' => '{{guardian_phone}}', 'availability' => 'always'],
                    ['tag' => 'father_phone', 'label' => "Father's Phone", 'kind' => 'text', 'token' => '{{father_phone}}', 'availability' => 'always'],
                    ['tag' => 'mother_phone', 'label' => "Mother's Phone", 'kind' => 'text', 'token' => '{{mother_phone}}', 'availability' => 'always'],
                    ['tag' => 'mobile_no', 'label' => 'Mobile No.', 'kind' => 'text', 'token' => '{{mobile_no}}', 'availability' => 'always'],
                    ['tag' => 'mobile_number', 'label' => 'Mobile Number', 'kind' => 'text', 'token' => '{{mobile_number}}', 'availability' => 'always'],
                    ['tag' => 'father_email', 'label' => "Father's Email", 'kind' => 'text', 'token' => '{{father_email}}', 'availability' => 'always'],
                    ['tag' => 'mother_email', 'label' => "Mother's Email", 'kind' => 'text', 'token' => '{{mother_email}}', 'availability' => 'always'],
                    ['tag' => 'emergency_contact', 'label' => 'Emergency Contact', 'kind' => 'text', 'token' => '{{emergency_contact}}', 'availability' => 'always'],
                    ['tag' => 'current_address', 'label' => 'Address', 'kind' => 'text', 'token' => '{{current_address}}', 'availability' => 'always'],
                    ['tag' => 'address', 'label' => 'Address (alt)', 'kind' => 'text', 'token' => '{{address}}', 'availability' => 'always'],
                    ['tag' => 'phone', 'label' => 'Phone', 'kind' => 'text', 'token' => '{{phone}}', 'availability' => 'always'],
                    ['tag' => 'transport_route', 'label' => 'Transport Route', 'kind' => 'text', 'token' => '{{transport_route}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'Staff',
                'items' => [
                    ['tag' => 'staff_name', 'label' => 'Staff Name', 'kind' => 'text', 'token' => '{{staff_name}}', 'availability' => 'always'],
                    ['tag' => 'staff_no', 'label' => 'Staff No.', 'kind' => 'text', 'token' => '{{staff_no}}', 'availability' => 'always'],
                    ['tag' => 'designation', 'label' => 'Designation', 'kind' => 'text', 'token' => '{{designation}}', 'availability' => 'always'],
                    ['tag' => 'department', 'label' => 'Department', 'kind' => 'text', 'token' => '{{department}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'School & Issuing',
                'items' => [
                    ['tag' => 'school_name', 'label' => 'School Name', 'kind' => 'text', 'token' => '{{school_name}}', 'availability' => 'always'],
                    ['tag' => 'school_address', 'label' => 'School Address', 'kind' => 'text', 'token' => '{{school_address}}', 'availability' => 'always'],
                    ['tag' => 'school_phone', 'label' => 'School Phone', 'kind' => 'text', 'token' => '{{school_phone}}', 'availability' => 'always'],
                    ['tag' => 'school_email', 'label' => 'School Email', 'kind' => 'text', 'token' => '{{school_email}}', 'availability' => 'always'],
                    ['tag' => 'school_website', 'label' => 'School Website', 'kind' => 'text', 'token' => '{{school_website}}', 'availability' => 'always'],
                    ['tag' => 'school_affiliation', 'label' => 'Affiliation / Reg. No.', 'kind' => 'text', 'token' => '{{school_affiliation}}', 'availability' => 'always'],
                    ['tag' => 'currency_code', 'label' => 'Currency Code', 'kind' => 'text', 'token' => '{{currency_code}}', 'availability' => 'always'],
                    ['tag' => 'currency_symbol', 'label' => 'Currency Symbol', 'kind' => 'text', 'token' => '{{currency_symbol}}', 'availability' => 'always'],
                    ['tag' => 'current_date', 'label' => 'Current Date', 'kind' => 'text', 'token' => '{{current_date}}', 'availability' => 'always'],
                    ['tag' => 'issue_date', 'label' => 'Issue Date', 'kind' => 'text', 'token' => '{{issue_date}}', 'availability' => 'doc'],
                    ['tag' => 'issued_by', 'label' => 'Issued By', 'kind' => 'text', 'token' => '{{issued_by}}', 'availability' => 'doc'],
                    ['tag' => 'signatory_name', 'label' => 'Signatory Name', 'kind' => 'text', 'token' => '{{signatory_name}}', 'availability' => 'doc'],
                    ['tag' => 'achievement', 'label' => 'Achievement', 'kind' => 'text', 'token' => '{{achievement}}', 'availability' => 'doc'],
                ],
            ],
            [
                'group' => 'Alerts & Notifications',
                'items' => [
                    ['tag' => 'alert_subject', 'label' => 'Alert Subject', 'kind' => 'text', 'token' => '{{alert_subject}}', 'availability' => 'always'],
                    ['tag' => 'alert_message', 'label' => 'Alert Message', 'kind' => 'text', 'token' => '{{alert_message}}', 'availability' => 'always'],
                    ['tag' => 'attendance_status', 'label' => 'Attendance Status', 'kind' => 'text', 'token' => '{{attendance_status}}', 'availability' => 'always'],
                    ['tag' => 'attendance_date', 'label' => 'Attendance Date', 'kind' => 'text', 'token' => '{{attendance_date}}', 'availability' => 'always'],
                    ['tag' => 'attendance_remarks', 'label' => 'Attendance Remarks', 'kind' => 'text', 'token' => '{{attendance_remarks}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'Meetings & Events',
                'items' => [
                    ['tag' => 'meeting_date', 'label' => 'Meeting Date', 'kind' => 'text', 'token' => '{{meeting_date}}', 'availability' => 'always'],
                    ['tag' => 'meeting_time', 'label' => 'Meeting Time', 'kind' => 'text', 'token' => '{{meeting_time}}', 'availability' => 'always'],
                    ['tag' => 'venue', 'label' => 'Venue', 'kind' => 'text', 'token' => '{{venue}}', 'availability' => 'always'],
                    ['tag' => 'holiday_date', 'label' => 'Holiday Date', 'kind' => 'text', 'token' => '{{holiday_date}}', 'availability' => 'always'],
                    ['tag' => 'holiday_reason', 'label' => 'Holiday Reason', 'kind' => 'text', 'token' => '{{holiday_reason}}', 'availability' => 'always'],
                    ['tag' => 'resume_date', 'label' => 'Resume Date', 'kind' => 'text', 'token' => '{{resume_date}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'Transport',
                'items' => [
                    ['tag' => 'stop_name', 'label' => 'Bus Stop', 'kind' => 'text', 'token' => '{{stop_name}}', 'availability' => 'always'],
                    ['tag' => 'arrival_time', 'label' => 'Arrival Time', 'kind' => 'text', 'token' => '{{arrival_time}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'Homework & Activities',
                'items' => [
                    ['tag' => 'homework_details', 'label' => 'Homework Details', 'kind' => 'text', 'token' => '{{homework_details}}', 'availability' => 'always'],
                    ['tag' => 'submission_date', 'label' => 'Submission Date', 'kind' => 'text', 'token' => '{{submission_date}}', 'availability' => 'always'],
                ],
            ],
            [
                'group' => 'Exam & Hall Ticket',
                'items' => [
                    ['tag' => 'exam_name', 'label' => 'Exam Name', 'kind' => 'text', 'token' => '{{exam_name}}', 'availability' => 'exam'],
                    ['tag' => 'exam_name_upper', 'label' => 'Exam Name (UPPER)', 'kind' => 'text', 'token' => '{{exam_name_upper}}', 'availability' => 'exam'],
                    ['tag' => 'exam_session', 'label' => 'Exam Session', 'kind' => 'text', 'token' => '{{exam_session}}', 'availability' => 'exam'],
                    ['tag' => 'exam_start_date', 'label' => 'Exam Start Date', 'kind' => 'text', 'token' => '{{exam_start_date}}', 'availability' => 'exam'],
                    ['tag' => 'exam_end_date', 'label' => 'Exam End Date', 'kind' => 'text', 'token' => '{{exam_end_date}}', 'availability' => 'exam'],
                    ['tag' => 'exam_centre', 'label' => 'Exam Centre', 'kind' => 'text', 'token' => '{{exam_centre}}', 'availability' => 'exam'],
                    ['tag' => 'reporting_time', 'label' => 'Reporting Time', 'kind' => 'text', 'token' => '{{reporting_time}}', 'availability' => 'exam'],
                    ['tag' => 'hall_ticket_no', 'label' => 'Hall Ticket No.', 'kind' => 'text', 'token' => '{{hall_ticket_no}}', 'availability' => 'exam'],
                    ['tag' => 'registration_no', 'label' => 'Registration No.', 'kind' => 'text', 'token' => '{{registration_no}}', 'availability' => 'exam'],
                    ['tag' => 'pen_number', 'label' => 'PEN Number', 'kind' => 'text', 'token' => '{{pen_number}}', 'availability' => 'exam'],
                    ['tag' => 'term_class', 'label' => 'Term Class', 'kind' => 'text', 'token' => '{{term_class}}', 'availability' => 'exam'],
                    ['tag' => 'term_section', 'label' => 'Term Section', 'kind' => 'text', 'token' => '{{term_section}}', 'availability' => 'exam'],
                    ['tag' => 'instructions', 'label' => 'Instructions', 'kind' => 'text', 'token' => '{{instructions}}', 'availability' => 'exam'],
                    ['tag' => 'exam_schedule_table', 'label' => 'Exam Schedule (table)', 'kind' => 'table', 'token' => '{{exam_schedule_table}}', 'availability' => 'exam'],
                ],
            ],
            [
                'group' => 'Result & Report',
                'items' => [
                    ['tag' => 'result_status', 'label' => 'Result (Pass/Fail)', 'kind' => 'text', 'token' => '{{result_status}}', 'availability' => 'result'],
                    ['tag' => 'rank', 'label' => 'Rank', 'kind' => 'text', 'token' => '{{rank}}', 'availability' => 'result'],
                    ['tag' => 'marks_obtained', 'label' => 'Marks Obtained', 'kind' => 'text', 'token' => '{{marks_obtained}}', 'availability' => 'result'],
                    ['tag' => 'total_marks', 'label' => 'Total Marks', 'kind' => 'text', 'token' => '{{total_marks}}', 'availability' => 'result'],
                    ['tag' => 'attendance_percentage', 'label' => 'Attendance %', 'kind' => 'text', 'token' => '{{attendance_percentage}}', 'availability' => 'result'],
                    ['tag' => 'present_days', 'label' => 'Present Days', 'kind' => 'text', 'token' => '{{present_days}}', 'availability' => 'result'],
                    ['tag' => 'total_days', 'label' => 'Total Days', 'kind' => 'text', 'token' => '{{total_days}}', 'availability' => 'result'],
                    ['tag' => 'consolidated_marks_table', 'label' => 'Marks Table', 'kind' => 'table', 'token' => '{{consolidated_marks_table}}', 'availability' => 'result'],
                    ['tag' => 'cocurricular_table', 'label' => 'Co-curricular Table', 'kind' => 'table', 'token' => '{{cocurricular_table}}', 'availability' => 'result'],
                    ['tag' => 'grading_scale_table', 'label' => 'Grading Scale Table', 'kind' => 'table', 'token' => '{{grading_scale_table}}', 'availability' => 'result'],
                    ['tag' => 'grading_scale_inline', 'label' => 'Grading Scale (inline)', 'kind' => 'table', 'token' => '{{grading_scale_inline}}', 'availability' => 'result'],
                    ['tag' => 'principal_remark', 'label' => 'Principal Remark', 'kind' => 'text', 'token' => '{{principal_remark}}', 'availability' => 'doc'],
                    ['tag' => 'teacher_remark', 'label' => 'Teacher Remark', 'kind' => 'text', 'token' => '{{teacher_remark}}', 'availability' => 'doc'],
                ],
            ],
            [
                'group' => 'Fee & Receipt',
                'items' => [
                    ['tag' => 'receipt_no', 'label' => 'Receipt No.', 'kind' => 'text', 'token' => '{{receipt_no}}', 'availability' => 'fee'],
                    ['tag' => 'cheque_no', 'label' => 'Cheque No.', 'kind' => 'text', 'token' => '{{cheque_no}}', 'availability' => 'fee'],
                    ['tag' => 'transaction_id', 'label' => 'Transaction ID', 'kind' => 'text', 'token' => '{{transaction_id}}', 'availability' => 'fee'],
                    ['tag' => 'transaction_bank_name', 'label' => 'Bank Name', 'kind' => 'text', 'token' => '{{transaction_bank_name}}', 'availability' => 'fee'],
                    ['tag' => 'payment_mode', 'label' => 'Payment Mode', 'kind' => 'text', 'token' => '{{payment_mode}}', 'availability' => 'fee'],
                    ['tag' => 'payment_date', 'label' => 'Payment Date', 'kind' => 'text', 'token' => '{{payment_date}}', 'availability' => 'fee'],
                    ['tag' => 'payment_date_short', 'label' => 'Payment Date (Short)', 'kind' => 'text', 'token' => '{{payment_date_short}}', 'availability' => 'fee'],
                    ['tag' => 'payment_datetime', 'label' => 'Payment Date & Time', 'kind' => 'text', 'token' => '{{payment_datetime}}', 'availability' => 'fee'],
                    ['tag' => 'due_date', 'label' => 'Fee Due Date', 'kind' => 'text', 'token' => '{{due_date}}', 'availability' => 'fee'],
                    ['tag' => 'total_paid', 'label' => 'Total Paid', 'kind' => 'text', 'token' => '{{total_paid}}', 'availability' => 'fee'],
                    ['tag' => 'student_overall_balance_due', 'label' => 'Balance Due', 'kind' => 'text', 'token' => '{{student_overall_balance_due}}', 'availability' => 'fee'],
                    ['tag' => 'total_in_words', 'label' => 'Total In Words', 'kind' => 'text', 'token' => '{{total_in_words}}', 'availability' => 'fee'],
                    ['tag' => 'receipt_terms', 'label' => 'Receipt Terms', 'kind' => 'text', 'token' => '{{receipt_terms}}', 'availability' => 'fee'],
                    ['tag' => 'fee_group_breakdown_table', 'label' => 'Fee Breakdown Table', 'kind' => 'table', 'token' => '{{fee_group_breakdown_table}}', 'availability' => 'fee'],
                    ['tag' => 'fee_breakdown_grouped_table', 'label' => 'Fee Breakdown (grouped)', 'kind' => 'table', 'token' => '{{fee_breakdown_grouped_table}}', 'availability' => 'fee'],
                ],
            ],
        ];
    }

    /**
     * Token lookup used to substitute the {{...}} tokens present in a template's
     * printable HTML for an arbitrary slot context.
     *
     * @return array<string, string> token => contextual data key
     */
    public static function tokenDataKeys(): array
    {
        return [
            '{{student_name}}' => 'student_name',
            '{{admission_no}}' => 'admission_no',
            '{{roll_no}}' => 'roll_no',
            '{{class_section}}' => 'class_section',
            '{{class}}' => 'class',
            '{{section}}' => 'section',
            '{{dob}}' => 'dob',
            '{{blood_group}}' => 'blood_group',
            '{{house}}' => 'house',
            '{{academic_session}}' => 'academic_session',
            '{{class_teacher_name}}' => 'class_teacher_name',
            '{{class_teacher_designation}}' => 'class_teacher_designation',
            '{{father_name}}' => 'father_name',
            '{{mother_name}}' => 'mother_name',
            '{{guardian_phone}}' => 'guardian_phone',
            '{{emergency_contact}}' => 'emergency_contact',
            '{{current_address}}' => 'current_address',
            '{{transport_route}}' => 'transport_route',
            '{{staff_name}}' => 'staff_name',
            '{{staff_no}}' => 'staff_no',
            '{{designation}}' => 'designation',
            '{{department}}' => 'department',
            '{{school_name}}' => 'school_name',
            '{{current_date}}' => 'current_date',
            '{{issue_date}}' => 'issue_date',
            '{{issued_by}}' => 'issued_by',
            '{{alert_subject}}' => 'alert_subject',
            '{{alert_message}}' => 'alert_message',
            '{{achievement}}' => 'achievement',
            '{{exam_name}}' => 'exam_name',
            '{{exam_session}}' => 'exam_session',
            '{{exam_start_date}}' => 'exam_start_date',
            '{{exam_end_date}}' => 'exam_end_date',
            '{{student_photo_url}}' => 'student_photo_url',
            '{{school_logo_url}}' => 'school_logo_url',
            '{{qr_code_url}}' => 'qr_code_url',
            '{{secure_attendance_qr}}' => 'secure_attendance_qr',
            '{{principal_signature_url}}' => 'principal_signature_url',
            '{{class_teacher_signature}}' => 'class_teacher_signature',
            '{{staff_photo_url}}' => 'staff_photo_url',
            '{{staff_signature}}' => 'staff_signature',
            '{{barcode_url}}' => 'barcode_url',
            // Imported demo designs (112 templates) use the working vocabulary
            // beyond the core catalog. Every token below is substituted at print
            // time; contexts without data for a key simply render it empty.
            '{{school_address}}' => 'school_address',
            '{{address}}' => 'address',
            '{{school_phone}}' => 'school_phone',
            '{{phone}}' => 'phone',
            '{{school_email}}' => 'school_email',
            '{{school_website}}' => 'school_website',
            '{{school_affiliation}}' => 'school_affiliation',
            '{{currency_code}}' => 'currency_code',
            '{{currency_symbol}}' => 'currency_symbol',
            '{{class_name}}' => 'class_name',
            '{{section_name}}' => 'section_name',
            '{{first_name}}' => 'first_name',
            '{{last_name}}' => 'last_name',
            '{{gender}}' => 'gender',
            '{{admission_date}}' => 'admission_date',
            '{{date_of_joining}}' => 'date_of_joining',
            '{{father_phone}}' => 'father_phone',
            '{{father_email}}' => 'father_email',
            '{{mother_phone}}' => 'mother_phone',
            '{{mother_email}}' => 'mother_email',
            '{{guardian_name}}' => 'guardian_name',
            '{{mobile_no}}' => 'mobile_no',
            '{{mobile_number}}' => 'mobile_number',
            '{{exam_name_upper}}' => 'exam_name_upper',
            '{{exam_centre}}' => 'exam_centre',
            '{{reporting_time}}' => 'reporting_time',
            '{{hall_ticket_no}}' => 'hall_ticket_no',
            '{{registration_no}}' => 'registration_no',
            '{{pen_number}}' => 'pen_number',
            '{{attendance_percentage}}' => 'attendance_percentage',
            '{{present_days}}' => 'present_days',
            '{{total_days}}' => 'total_days',
            '{{result_status}}' => 'result_status',
            '{{rank}}' => 'rank',
            '{{term_class}}' => 'term_class',
            '{{term_section}}' => 'term_section',
            '{{instructions}}' => 'instructions',
            '{{exam_schedule_table}}' => 'exam_schedule_table',
            '{{consolidated_marks_table}}' => 'consolidated_marks_table',
            '{{cocurricular_table}}' => 'cocurricular_table',
            '{{grading_scale_table}}' => 'grading_scale_table',
            '{{grading_scale_inline}}' => 'grading_scale_inline',
            '{{fee_group_breakdown_table}}' => 'fee_group_breakdown_table',
            '{{fee_breakdown_grouped_table}}' => 'fee_breakdown_grouped_table',
            '{{receipt_terms}}' => 'receipt_terms',
            '{{receipt_no}}' => 'receipt_no',
            '{{cheque_no}}' => 'cheque_no',
            '{{payment_mode}}' => 'payment_mode',
            '{{payment_date}}' => 'payment_date',
            '{{payment_date_short}}' => 'payment_date_short',
            '{{payment_datetime}}' => 'payment_datetime',
            '{{transaction_id}}' => 'transaction_id',
            '{{transaction_bank_name}}' => 'transaction_bank_name',
            '{{total_paid}}' => 'total_paid',
            '{{student_overall_balance_due}}' => 'student_overall_balance_due',
            '{{total_in_words}}' => 'total_in_words',
            '{{principal_remark}}' => 'principal_remark',
            '{{teacher_remark}}' => 'teacher_remark',
            '{{signatory_name}}' => 'signatory_name',
            '{{qr_code}}' => 'qr_code',
            '{{admit_card_qr}}' => 'admit_card_qr',
            // QWA automatic-alert templates (parent meeting, holidays, transport,
            // exam results, homework, attendance, fees and admission confirmations)
            // reference named variables beyond the printable vocabulary.
            '{{academic_year}}' => 'academic_year',
            '{{meeting_date}}' => 'meeting_date',
            '{{meeting_time}}' => 'meeting_time',
            '{{venue}}' => 'venue',
            '{{holiday_date}}' => 'holiday_date',
            '{{holiday_reason}}' => 'holiday_reason',
            '{{resume_date}}' => 'resume_date',
            '{{stop_name}}' => 'stop_name',
            '{{arrival_time}}' => 'arrival_time',
            '{{marks_obtained}}' => 'marks_obtained',
            '{{total_marks}}' => 'total_marks',
            '{{homework_details}}' => 'homework_details',
            '{{submission_date}}' => 'submission_date',
            '{{attendance_status}}' => 'attendance_status',
            '{{attendance_date}}' => 'attendance_date',
            '{{attendance_remarks}}' => 'attendance_remarks',
            '{{due_date}}' => 'due_date',
        ];
    }

    /**
     * Grouped, text-only placeholder palette exposed to writers of WhatsApp
     * message templates so QWA placeholders can be mapped onto the app's
     * variable vocabulary.
     *
     * @return array<int, array{group: string, items: array<int, array{token: string, tag: string, label: string}>}>
     */
    public static function templateTokensPayload(): array
    {
        return collect(static::placeholderGroups())
            ->map(fn (array $group) => [
                'group' => $group['group'],
                'items' => collect($group['items'] ?? [])
                    ->filter(fn (array $item) => ($item['kind'] ?? 'text') === 'text')
                    ->map(fn (array $item) => [
                        'token' => (string) ($item['token'] ?? ''),
                        'tag' => (string) ($item['tag'] ?? ''),
                        'label' => (string) ($item['label'] ?? ''),
                    ])
                    ->values()
                    ->all(),
            ])
            ->filter(fn (array $group) => $group['items'] !== [])
            ->values()
            ->all();
    }
}