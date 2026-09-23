<?php

namespace App\Services;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\Student;
use App\Support\TemplateCatalog;

/**
 * Renders the assigned template for a print slot into a printable HTML twin.
 *
 * The twin uses the same {{token}} palette as the legacy element renderer, so
 * any slot (server / react / blade) can hand a context array to renderHtml().
 * When a slot has no assignment, consumers fall back to their existing layout.
 */
class TemplateRenderService
{
    public function __construct(private readonly TemplateAssignmentService $assignments)
    {
    }

    /**
     * Resolve the template assigned to a slot (or null when unassigned).
     */
    public function resolveFor(Organization $organization, string $slot): ?CertificateTemplate
    {
        return $this->assignments->defaultFor($organization, $slot);
    }

    /**
     * Render the assigned template's front face for one context row.
     *
     * @return array{html: ?string, back_html: ?string, card_width_mm: ?float, card_height_mm: ?float}
     */
    public function render(Organization $organization, string $slot, array $context): array
    {
        $template = $this->resolveFor($organization, $slot);

        if (! $template || empty($template->content)) {
            return ['html' => null, 'back_html' => null, 'card_width_mm' => null, 'card_height_mm' => null];
        }

        return [
            'html' => $this->substitute($template->content, $context),
            'back_html' => $template->back_content ? $this->substitute($template->back_content, $context) : null,
            'card_width_mm' => $template->card_width_mm ? (float) $template->card_width_mm : null,
            'card_height_mm' => $template->card_height_mm ? (float) $template->card_height_mm : null,
        ];
    }

    /**
     * Replace every {{token}} present in the HTML twin using the catalog's
     * token→context mapping. Missing tokens render as an empty string, any
     * placeholder not present in the catalog is stripped, and <img> tags whose
     * source resolved empty are removed, so printable output never spills the
     * raw placeholder or a broken image icon.
     */
    public function substitute(string $html, array $context): string
    {
        $map = [];
        foreach (TemplateCatalog::tokenDataKeys() as $token => $key) {
            $map[$token] = $context[$key] ?? '';
        }

        $html = strtr($html, $map);
        $html = preg_replace('/\{\{[a-z_0-9]+\}\}/i', '', $html) ?? $html;
        $html = preg_replace('/<img\b[^>]*\bsrc=""[^>]*>/i', '', $html) ?? $html;

        return $html;
    }

    /**
     * Default school + student context shared by every printable flow, covering
     * the full token palette used by the imported demo designs. Keys that need
     * slot-specific values (exam, fees, remarks, generated tables) start empty;
     * callers merge their own data on top.
     */
    public function schoolAndStudentContext(Organization $organization, ?Student $student = null): array
    {
        $settings = $organization->settings ?? [];
        $year = $organization->selectedAcademicYear();
        $session = $year?->name ?? '';
        $fullAddress = trim(implode(', ', array_filter([
            $organization->address,
            $organization->city,
            $organization->state,
            $organization->pincode,
        ])));

        $currency = $settings['currency'] ?? 'INR';
        $symbols = ['INR' => '₹', 'USD' => '$', 'EUR' => '€', 'GBP' => '£'];
        $currencySymbol = $symbols[$currency] ?? $currency;

        $affiliation = trim($settings['compliance_profile']['affiliation_no'] ?? '');

        return [
            'student_name' => $student ? trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? '')) : '',
            'first_name' => $student?->first_name ?? '',
            'last_name' => $student?->last_name ?? '',
            'admission_no' => $student?->admission_no ?? '',
            'roll_no' => $student?->roll_number ?? '',
            'admission_date' => $student?->admission_date ? $student->admission_date->format('j M Y') : '',
            'date_of_joining' => $student?->admission_date ? $student->admission_date->format('j M Y') : '',
            'gender' => $student?->gender ?? '',
            'dob' => $student?->date_of_birth ? $student->date_of_birth->format('j M Y') : '',
            'blood_group' => $student?->blood_group ?? '',
            'house' => $student?->house ?? '',
            'father_name' => $student?->father_name ?? '',
            'father_phone' => $student?->father_phone ?? '',
            'father_email' => $student?->father_email ?? '',
            'mother_name' => $student?->mother_name ?? '',
            'mother_phone' => $student?->mother_phone ?? '',
            'mother_email' => $student?->mother_email ?? '',
            'guardian_name' => $student?->guardian_name ?? '',
            'guardian_phone' => $student?->guardian_phone ?? ($student?->father_phone ?? ''),
            'transport_route' => $student?->transport_route ?? '',
            'current_address' => $student?->current_address ?? '',
            'mobile_no' => $student?->father_phone ?? '',
            'mobile_number' => $student?->father_phone ?? '',
            'class' => $student?->schoolClass?->name ?? '',
            'section' => $student?->schoolClass?->section ?? '',
            'class_name' => $student?->schoolClass?->name ?? '',
            'section_name' => $student?->schoolClass?->section ?? '',
            'class_section' => $student
                ? trim(($student->schoolClass?->name ?? '') . ($student->schoolClass?->section ? ' - ' . $student->schoolClass->section : ''))
                : '',
            'school_name' => $organization->name,
            'school_address' => $organization->address ?? '',
            'address' => $fullAddress,
            'phone' => $organization->phone ?? '',
            'school_phone' => $organization->phone ?? '',
            'school_email' => $organization->email ?? '',
            'school_website' => $organization->website ?? '',
            'school_affiliation' => $affiliation,
            'school_logo_url' => $organization->logo ? asset('storage/' . $organization->logo) : '',
            'student_photo_url' => $student?->profile_photo ? asset('storage/' . $student->profile_photo) : '',
            'currency_code' => $currency,
            'currency_symbol' => $currencySymbol,
            'academic_session' => $session,
            'current_date' => now()->format('j F Y'),
            'issue_date' => now()->format('j F Y'),
            'issued_by' => '',
            'exam_name' => '',
            'exam_name_upper' => '',
            'exam_session' => $session,
            'exam_start_date' => '',
            'exam_end_date' => '',
            'exam_centre' => '',
            'exam_schedule_table' => '',
            'reporting_time' => '',
            'hall_ticket_no' => '',
            'registration_no' => '',
            'pen_number' => '',
            'attendance_percentage' => '',
            'present_days' => '',
            'total_days' => '',
            'result_status' => '',
            'rank' => '',
            'term_class' => '',
            'term_section' => '',
            'instructions' => '',
            'consolidated_marks_table' => '',
            'cocurricular_table' => '',
            'fee_group_breakdown_table' => '',
            'fee_breakdown_grouped_table' => '',
            'grading_scale_table' => '',
            'grading_scale_inline' => '',
            'receipt_terms' => '',
            'payment_mode' => '',
            'payment_date' => '',
            'payment_date_short' => '',
            'payment_datetime' => '',
            'receipt_no' => '',
            'cheque_no' => '',
            'transaction_id' => '',
            'transaction_bank_name' => '',
            'total_paid' => '',
            'student_overall_balance_due' => '',
            'total_in_words' => '',
            'principal_remark' => '',
            'teacher_remark' => '',
            'qr_code' => '',
            'admit_card_qr' => '',
            '_name' => '',
            'achievement' => '',
        ];
    }
}