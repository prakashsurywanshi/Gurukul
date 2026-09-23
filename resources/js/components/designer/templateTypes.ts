export interface TemplateDesignSummary {
    id: string;
    title: string;
    type: string;
    category: string | null;
    categoryLabel?: string | null;
    editorType: 'legacy' | 'fabric' | string;
    description?: string | null;
    design?: unknown;
    content?: string | null;
    contentJson?: unknown;
    backContent?: string | null;
    backContentJson?: unknown;
    thumbnailData?: { dataUrl?: string; width?: number; height?: number } | string | null;
    cardWidthMm?: number | null;
    cardHeightMm?: number | null;
    isSystem?: boolean;
    status?: string;
    createdAt?: string | null;
}

export interface TemplateSlot {
    key: string;
    label: string;
    category: string;
    renderer: 'react' | 'server' | 'blade' | string;
    module: string;
    description: string;
    template?: TemplateDesignSummary | null;
}

export interface TemplateCategory {
    key: string;
    label: string;
    count?: number;
}

export interface PlaceholderItem {
    tag: string;
    label: string;
    kind: 'text' | 'image' | 'table';
    token: string;
    standin?: 'avatar' | 'logo' | 'qr';
    w?: number;
    availability?: 'always' | 'exam' | 'result' | 'fee' | 'doc';
}

export interface PlaceholderGroup {
    group: string;
    items: PlaceholderItem[];
}

export function thumbnailSrc(template: TemplateDesignSummary | null | undefined): string | null {
    if (!template?.thumbnailData) return null;
    if (typeof template.thumbnailData === 'string') return template.thumbnailData;
    return template.thumbnailData.dataUrl ?? null;
}

const TOKEN_STANDIN: Record<string, 'avatar' | 'qr' | 'logo'> = {
    student_photo_url: 'avatar',
    staff_photo_url: 'avatar',
    school_logo_url: 'logo',
    principal_signature_url: 'logo',
    class_teacher_signature: 'logo',
    staff_signature: 'logo',
    qr_code_url: 'qr',
    secure_attendance_qr: 'qr',
    barcode_url: 'qr',
    qr_code: 'qr',
    admit_card_qr: 'qr',
};

function resolveImageStandin(src: string, standins: { avatar: string; qr: string; logo: string }): string {
    // Exact token src like src="{{school_logo_url}}"
    const tokOnly = src.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
    if (tokOnly) return standins[TOKEN_STANDIN[tokOnly[1].toLowerCase()] ?? 'logo'];

    // Identify the image category from a fragment (#token), embedded {{token}},
    // or from common URL/relative keywords (placeholder-*.svg, api.qrserver.com, …)
    const frag = src.match(/#([a-zA-Z0-9_]+)$/);
    const emb = src.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
    const token = frag?.[1] ?? emb?.[1];

    let kind: 'avatar' | 'qr' | 'logo' = 'logo';
    if (token && TOKEN_STANDIN[token.toLowerCase()]) {
        kind = TOKEN_STANDIN[token.toLowerCase()];
    } else {
        const s = src.toLowerCase();
        if (/avatar|student_photo|staff_photo|photo|headshot/i.test(s)) kind = 'avatar';
        else if (/qr|barcode|attendance|api\.qrserver/i.test(s)) kind = 'qr';
    }
    return standins[kind];
}

export function twinWithStandins(
    twin: string | null | undefined,
    standins: { avatar: string; qr: string; logo: string },
): string {
    if (!twin) return '';
    // Rewrite every non-data src so the gallery/preview iframe never shows
    // broken images from the original demo CDN or dead placeholder hosts.
    return twin.replace(/src\s*=\s*(["'])([^"']*)\1/gi, (_m, q: string, src: string) => {
        if (!src || src.startsWith('data:')) return _m;
        return `src=${q}${resolveImageStandin(src, standins)}${q}`;
    });
}

export const SAMPLE_VALUES: Record<string, string> = {
    school_name: 'Gurukul Public School',
    school_address: '12, Knowledge Park, Jaipur, Rajasthan 302001',
    school_phone: '+91 141 400 1234',
    school_email: 'admin@gurukulschool.edu',
    school_website: 'www.gurukulschool.edu',
    school_affiliation: 'CBSE 1730001',
    school_tagline: 'Learn · Grow · Shine',
    father_phone: '98765 43210',
    father_email: 'rajesh@example.com',
    mother_phone: '98765 43210',
    mother_email: 'sunita@example.com',
    payment_mode: 'Cash',
    payment_date: '15 Sep 2026',
    payment_date_short: '15 Sep 26',
    payment_datetime: '15 Sep 2026, 10:30 AM',
    receipt_no: 'RCPT-2026-001',
    transaction_id: 'TXN-88213',
    currency_symbol: '₹',
    total_paid: '₹5,000',
    total_in_words: 'Rupees Five Thousand Only',
    registration_no: 'REG-2026-001',
    exam_name_upper: 'TERM 1 EXAMINATION',
    exam_centre: 'Main Campus Hall',
    reporting_time: '9:00 AM',
    hall_ticket_no: 'HT-2026-001',
    general_signatory: 'Principal',
    signatory_name: 'Principal',
    instructions: 'Bring this ticket and your ID card. Reach the centre 15 minutes early.',
    date_of_joining: '01 Apr 2022',
    admission_date: '01 Apr 2022',
    staff_signature: '',
    student_name: 'Aarav Mehta',
    admission_no: 'ADM-2026-001',
    roll_no: '5',
    class_section: 'Class 10 - A',
    class: 'Class 10',
    section: 'Section A',
    dob: '15 Mar 2012',
    age: '14 years',
    blood_group: 'O+',
    gender: 'Male',
    father_name: 'Rajesh Mehta',
    mother_name: 'Sunita Mehta',
    guardian_name: 'Rajesh Mehta',
    guardian_phone: '98765 43210',
    emergency_contact: '98765 43210',
    current_address: '12, MG Road, Jaipur',
    permanent_address: '12, MG Road, Jaipur',
    transport_route: 'Route 4',
    house: 'Blue House',
    academic_session: '2026-2027',
    current_date: '20 Sep 2026',
    issue_date: '20 Sep 2026',
    expiry_date: '20 Sep 2027',
    issued_by: 'Principal',
    issued_on: '20 Sep 2026',
    staff_name: 'Kavita Patil',
    staff_no: 'EMP-0021',
    designation: 'Class Teacher',
    department: 'Academics',
    achievement: 'Certificate of Achievement',
    exam_name: 'Term 1 Examination',
    exam_session: '2026-2027',
    exam_start_date: '10 Sep 2026',
    exam_end_date: '25 Sep 2026',
    result_grade: 'A+',
    total_marks: '480 / 500',
    percentage: '96%',
    class_teacher_name: 'Ms. Kavita Patil',
    class_teacher_designation: 'Class Teacher',
    principal_name: 'Principal',
    class_name: 'Class 10',
    section_name: 'Section A',
    mobile_no: '98765 43210',
    mobile_number: '98765 43210',
    phone: '0141 400 1234',
    address: '14, Model Colony, Jaipur',
    pen_number: 'PEN-9X2K7',
    cheque_no: 'CHQ-0001',
    transaction_bank_name: 'State Bank of India',
    student_overall_balance_due: '₹0',
    receipt_terms: 'Amount received under authorization.',
    principal_remark: 'An earnest and hard-working student.',
    teacher_remark: 'Shows steady improvement in academics.',
    result_status: 'PASS',
    rank: '3',
    attendance_percentage: '94%',
    present_days: '188',
    total_days: '200',
    currency_code: 'INR',
    term_class: 'Class 10',
    term_section: 'Section A',
};

export function sampleForToken(token: string): string {
    const value = SAMPLE_VALUES[token.toLowerCase()];
    if (value !== undefined) return value;
    return token
        .split('_')
        .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
        .join(' ');
}

export function substituteTokensInText(text: string): string {
    return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, token: string) => sampleForToken(token));
}

export function twinWithSamples(
    twin: string | null | undefined,
    standins: { avatar: string; qr: string; logo: string },
): string {
    const withImages = twinWithStandins(twin, standins);
    if (!withImages) return '';
    return substituteTokensInText(withImages);
}

export function twinPreviewDoc(
    twin: string | null | undefined,
    standins: { avatar: string; qr: string; logo: string },
): string {
    const body = twinWithStandins(twin, standins);
    if (!body) return '';
    return `<!doctype html><html><head><meta charset="utf-8"/><style>html,body{margin:0;padding:0;background:#fff}</style></head><body>${body}</body></html>`;
}

export function twinPreviewDocWithSamples(
    twin: string | null | undefined,
    standins: { avatar: string; qr: string; logo: string },
): string {
    const body = twinWithSamples(twin, standins);
    if (!body) return '';
    return `<!doctype html><html><head><meta charset="utf-8"/><style>html,body{margin:0;padding:0;background:#fff}</style></head><body>${body}</body></html>`;
}