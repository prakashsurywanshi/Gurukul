import { qrSvgToken } from '../utils/qr';

/**
 * Client-side twin renderer for the printable "react" template slots
 * (student-id-card / staff-id-card).
 *
 * The server hands the page the single assigned template's sanitized HTML twin
 * plus a per-member token context; this module substitutes the {{token}}
 * placeholders (mirroring TemplateRenderService::substitute), embeds the QR as
 * an inline data-URI and produces the print document. When a page renders the
 * twin it skips its legacy element layout; when no template is assigned those
 * pages keep their existing behaviour.
 */

export interface AssignedIdCardTemplate {
    id: string;
    title: string;
    content: string;
    backContent?: string | null;
    cardWidthMm?: number | null;
    cardHeightMm?: number | null;
}

export type TokenContext = Record<string, string | number | null | undefined>;

export interface IdCardFace {
    html: string;
    widthMm: number;
    heightMm: number;
}

/**
 * token => context key, mirroring TemplateCatalog::tokenDataKeys() so the
 * client substitutes exactly the same vocabulary as the server seam.
 */
export const TOKEN_DATA_KEYS: Record<string, string> = {
    '{{student_name}}': 'student_name',
    '{{admission_no}}': 'admission_no',
    '{{roll_no}}': 'roll_no',
    '{{class_section}}': 'class_section',
    '{{class}}': 'class',
    '{{section}}': 'section',
    '{{dob}}': 'dob',
    '{{blood_group}}': 'blood_group',
    '{{house}}': 'house',
    '{{academic_session}}': 'academic_session',
    '{{class_teacher_name}}': 'class_teacher_name',
    '{{class_teacher_designation}}': 'class_teacher_designation',
    '{{father_name}}': 'father_name',
    '{{mother_name}}': 'mother_name',
    '{{guardian_phone}}': 'guardian_phone',
    '{{emergency_contact}}': 'emergency_contact',
    '{{current_address}}': 'current_address',
    '{{transport_route}}': 'transport_route',
    '{{staff_name}}': 'staff_name',
    '{{staff_no}}': 'staff_no',
    '{{designation}}': 'designation',
    '{{department}}': 'department',
    '{{school_name}}': 'school_name',
    '{{current_date}}': 'current_date',
    '{{issue_date}}': 'issue_date',
    '{{issued_by}}': 'issued_by',
    '{{achievement}}': 'achievement',
    '{{exam_name}}': 'exam_name',
    '{{exam_session}}': 'exam_session',
    '{{exam_start_date}}': 'exam_start_date',
    '{{exam_end_date}}': 'exam_end_date',
    '{{student_photo_url}}': 'student_photo_url',
    '{{school_logo_url}}': 'school_logo_url',
    '{{qr_code_url}}': 'qr_code_url',
    '{{secure_attendance_qr}}': 'secure_attendance_qr',
    '{{principal_signature_url}}': 'principal_signature_url',
    '{{class_teacher_signature}}': 'class_teacher_signature',
    '{{staff_photo_url}}': 'staff_photo_url',
    '{{staff_signature}}': 'staff_signature',
    '{{barcode_url}}': 'barcode_url',
    '{{school_address}}': 'school_address',
    '{{address}}': 'address',
    '{{school_phone}}': 'school_phone',
    '{{phone}}': 'phone',
    '{{school_email}}': 'school_email',
    '{{school_website}}': 'school_website',
    '{{school_affiliation}}': 'school_affiliation',
    '{{currency_code}}': 'currency_code',
    '{{currency_symbol}}': 'currency_symbol',
    '{{class_name}}': 'class_name',
    '{{section_name}}': 'section_name',
    '{{first_name}}': 'first_name',
    '{{last_name}}': 'last_name',
    '{{gender}}': 'gender',
    '{{admission_date}}': 'admission_date',
    '{{date_of_joining}}': 'date_of_joining',
    '{{father_phone}}': 'father_phone',
    '{{father_email}}': 'father_email',
    '{{mother_phone}}': 'mother_phone',
    '{{mother_email}}': 'mother_email',
    '{{guardian_name}}': 'guardian_name',
    '{{mobile_no}}': 'mobile_no',
    '{{mobile_number}}': 'mobile_number',
    '{{exam_name_upper}}': 'exam_name_upper',
    '{{exam_centre}}': 'exam_centre',
    '{{reporting_time}}': 'reporting_time',
    '{{hall_ticket_no}}': 'hall_ticket_no',
    '{{registration_no}}': 'registration_no',
    '{{pen_number}}': 'pen_number',
    '{{attendance_percentage}}': 'attendance_percentage',
    '{{present_days}}': 'present_days',
    '{{total_days}}': 'total_days',
    '{{result_status}}': 'result_status',
    '{{rank}}': 'rank',
    '{{term_class}}': 'term_class',
    '{{term_section}}': 'term_section',
    '{{instructions}}': 'instructions',
    '{{exam_schedule_table}}': 'exam_schedule_table',
    '{{consolidated_marks_table}}': 'consolidated_marks_table',
    '{{cocurricular_table}}': 'cocurricular_table',
    '{{grading_scale_table}}': 'grading_scale_table',
    '{{grading_scale_inline}}': 'grading_scale_inline',
    '{{fee_group_breakdown_table}}': 'fee_group_breakdown_table',
    '{{fee_breakdown_grouped_table}}': 'fee_breakdown_grouped_table',
    '{{receipt_terms}}': 'receipt_terms',
    '{{receipt_no}}': 'receipt_no',
    '{{cheque_no}}': 'cheque_no',
    '{{payment_mode}}': 'payment_mode',
    '{{payment_date}}': 'payment_date',
    '{{payment_date_short}}': 'payment_date_short',
    '{{payment_datetime}}': 'payment_datetime',
    '{{transaction_id}}': 'transaction_id',
    '{{transaction_bank_name}}': 'transaction_bank_name',
    '{{total_paid}}': 'total_paid',
    '{{student_overall_balance_due}}': 'student_overall_balance_due',
    '{{total_in_words}}': 'total_in_words',
    '{{principal_remark}}': 'principal_remark',
    '{{teacher_remark}}': 'teacher_remark',
    '{{signatory_name}}': 'signatory_name',
    '{{qr_code}}': 'qr_code',
    '{{admit_card_qr}}': 'admit_card_qr',
};

/**
 * Replace {{token}} placeholders with the supplied context, strip any
 * placeholder the context does not provide, and drop <img> tags whose source
 * resolved empty — the client twin of TemplateRenderService::substitute().
 */
export function substituteTemplate(html: string, context: TokenContext): string {
    let output = html;

    for (const token of Object.keys(TOKEN_DATA_KEYS)) {
        const value = context[TOKEN_DATA_KEYS[token]];
        if (value == null) {
            output = output.split(token).join('');
        } else {
            output = output.split(token).join(String(value));
        }
    }

    output = output.replace(/\{\{[a-zA-Z_0-9]+\}\}/g, '');
    output = output.replace(/<img\b[^>]*\bsrc=""[^>]*>/gi, '');

    return output;
}

/** Inline SVG data-URI for the member's QR token (used as an <img> source). */
export function qrCodeDataUri(value: string | null | undefined, size = 64): string {
    const token = (value ?? '').trim();
    if (!token) {
        return '';
    }

    return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvgToken(token, size))}`;
}

/** Context copy with the QR token converted into a printable data-URI. */
export function withQrCode(
    context: TokenContext,
    token: string | null | undefined,
    size = 64,
): TokenContext {
    return { ...context, qr_code_url: qrCodeDataUri(token, size) };
}

/** The printable faces of a template for one person (front, then back). */
export function idCardFaces(template: AssignedIdCardTemplate, context: TokenContext): IdCardFace[] {
    const widthMm = template.cardWidthMm ?? 85.6;
    const heightMm = template.cardHeightMm ?? 54;

    const front = substituteTemplate(template.content ?? '', context);
    const faces: IdCardFace[] = [{ html: front, widthMm, heightMm }];

    if (template.backContent) {
        faces.push({
            html: substituteTemplate(template.backContent, context),
            widthMm,
            heightMm,
        });
    }

    return faces;
}

const escapeTitle = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const faceToPage = (face: IdCardFace): string =>
    `<div class="cd-page" style="width:${face.widthMm}mm;height:${face.heightMm}mm;">${face.html}</div>`;

/**
 * Build the print-ready HTML for one or more identity cards and open it in a
 * new window. Faces are laid out one per page at their native (physical)
 * millimetre size, matching the server `template-print-sheet` seam.
 */
export function openIdCardPrintWindow(title: string, members: IdCardFace[][]): boolean {
    const bodies = members
        .flat()
        .map((face) => `<div style="page-break-after: always; break-after: page;">${faceToPage(face)}</div>`)
        .join('');

    const documentHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeTitle(title)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: auto; margin: 0; }
      body { background: #ffffff; }
      .cd-page { position: relative; overflow: hidden; }
    </style>
  </head>
  <body>
    ${bodies}
  </body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
        return false;
    }

    printWindow.document.write(documentHtml);
    printWindow.document.close();
    printWindow.focus();

    return true;
}