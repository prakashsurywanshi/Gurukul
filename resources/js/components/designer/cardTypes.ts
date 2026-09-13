export interface IdCardDesign {
    layout: 'landscape' | 'portrait';
    primary_color: string;
    show_photo: boolean;
    show_admission_no: boolean;
    show_qr: boolean;
    show_guardian: boolean;
    show_blood_group: boolean;
    show_dob: boolean;
}

export interface CardEntity {
    name: string;
    email?: string | null;
    phone?: string | null;
    classLabel?: string | null;
    idLabel?: string | null;
    admissionNo?: string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    dob?: string | null;
    guardian?: string | null;
    address?: string | null;
    roleLabel?: string | null;
    qrToken?: string | null;
    photoUrl?: string | null;
}

export const DEFAULT_ID_CARD_DESIGN: IdCardDesign = {
    layout: 'landscape',
    primary_color: '#1d4ed8',
    show_photo: true,
    show_admission_no: true,
    show_qr: true,
    show_guardian: true,
    show_blood_group: false,
    show_dob: true,
};

export const normalizeDesign = (value?: Partial<IdCardDesign> | null): IdCardDesign => ({
    ...DEFAULT_ID_CARD_DESIGN,
    ...(value ?? {}),
    layout: value?.layout === 'portrait' ? 'portrait' : 'landscape',
    show_photo: Boolean(value?.show_photo ?? DEFAULT_ID_CARD_DESIGN.show_photo),
    show_admission_no: Boolean(value?.show_admission_no ?? DEFAULT_ID_CARD_DESIGN.show_admission_no),
    show_qr: Boolean(value?.show_qr ?? DEFAULT_ID_CARD_DESIGN.show_qr),
    show_guardian: Boolean(value?.show_guardian ?? DEFAULT_ID_CARD_DESIGN.show_guardian),
    show_blood_group: Boolean(value?.show_blood_group ?? DEFAULT_ID_CARD_DESIGN.show_blood_group),
    show_dob: Boolean(value?.show_dob ?? DEFAULT_ID_CARD_DESIGN.show_dob),
});