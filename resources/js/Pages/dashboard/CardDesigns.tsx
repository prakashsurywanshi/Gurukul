import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { CreditCard, Save, Sparkles } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import CardFace from '../../components/designer/CardFace';
import { CardEntity, IdCardDesign } from '../../components/designer/cardTypes';
import {
    AssignedIdCardTemplate,
    TokenContext,
    idCardFaces,
    withQrCode,
} from '../../lib/templateTwin';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

type CardType = 'student' | 'staff';

const TOGGLE_KEYS = [
    'show_photo',
    'show_admission_no',
    'show_qr',
    'show_guardian',
    'show_blood_group',
    'show_dob',
] as const;

const TOGGLE_LABELS: Record<CardType, Record<(typeof TOGGLE_KEYS)[number], string>> = {
    student: {
        show_photo: 'Show student photo',
        show_admission_no: 'Show admission number',
        show_qr: 'Show QR code',
        show_guardian: 'Show guardian name',
        show_blood_group: 'Show blood group',
        show_dob: 'Show date of birth',
    },
    staff: {
        show_photo: 'Show photo',
        show_admission_no: 'Show employee ID',
        show_qr: 'Show QR code',
        show_guardian: 'Show designation',
        show_blood_group: 'Show blood group',
        show_dob: 'Show joining date',
    },
};

type DesignShape = {
    layout: IdCardDesign['layout'];
    primary_color: string;
    show_photo: boolean;
    show_admission_no: boolean;
    show_qr: boolean;
    show_guardian: boolean;
    show_blood_group: boolean;
    show_dob: boolean;
};

const toShape = (raw?: Partial<DesignShape> | null): DesignShape => ({
    layout: (raw?.layout as IdCardDesign['layout']) || 'landscape',
    primary_color: raw?.primary_color ?? '#1d4ed8',
    show_photo: Boolean(raw?.show_photo),
    show_admission_no: Boolean(raw?.show_admission_no),
    show_qr: Boolean(raw?.show_qr),
    show_guardian: Boolean(raw?.show_guardian),
    show_blood_group: Boolean(raw?.show_blood_group),
    show_dob: Boolean(raw?.show_dob),
});

const SAMPLE_ENTITIES: Record<CardType, CardEntity> = {
    student: {
        name: 'Aarav Sharma',
        email: 'aarav@gurukul.com',
        phone: '9876543210',
        classLabel: 'Class 5-A',
        admissionNo: 'ADM-1024',
        idLabel: 'ADM-1024',
        gender: 'Male',
        bloodGroup: 'A+',
        dob: '10-05-2015',
        guardian: 'Ramesh Sharma',
        address: '12, Main Road, Nagpur',
        qrToken: 'STU-sample',
    },
    staff: {
        name: 'Priya Deshmukh',
        email: 'priya@gurukul.com',
        phone: '9876501234',
        roleLabel: 'Teacher',
        idLabel: 'EMP-2048',
        gender: 'Female',
        bloodGroup: 'B+',
        dob: '12-04-2021',
        address: '45, Market Road, Nagpur',
        qrToken: 'EMP-sample',
    },
};

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const SAMPLE_SCHOOL: TokenContext = {
    school_name: 'Gurukul Model School',
    school_address: '12, MG Road, Jaipur, Rajasthan, India',
    school_phone: '+91 98765 43210',
    school_email: 'info@gurukul.edu',
    school_website: 'www.gurukul.edu',
};

const SAMPLE_PHOTO = svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150"><rect width="120" height="150" fill="#e2e8f0"/><circle cx="60" cy="58" r="32" fill="#94a3b8"/><path d="M18 150a42 52 0 0 1 84 0z" fill="#94a3b8"/></svg>`,
);

const SAMPLE_LOGO = svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1d4ed8"/><text x="32" y="44" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">G</text></svg>`,
);

const SAMPLE_CONTEXTS: Record<CardType, TokenContext> = {
    student: {
        student_name: SAMPLE_ENTITIES.student.name,
        admission_no: SAMPLE_ENTITIES.student.admissionNo,
        roll_no: '24',
        class: '5',
        section: 'A',
        class_section: SAMPLE_ENTITIES.student.classLabel,
        dob: SAMPLE_ENTITIES.student.dob,
        blood_group: SAMPLE_ENTITIES.student.bloodGroup,
        gender: SAMPLE_ENTITIES.student.gender,
        phone: SAMPLE_ENTITIES.student.phone,
        guardian_name: SAMPLE_ENTITIES.student.guardian,
        guardian_phone: SAMPLE_ENTITIES.student.phone,
        address: SAMPLE_ENTITIES.student.address,
        academic_session: '2025-26',
        student_photo_url: SAMPLE_PHOTO,
        school_logo_url: SAMPLE_LOGO,
        ...SAMPLE_SCHOOL,
    },
    staff: {
        staff_name: SAMPLE_ENTITIES.staff.name,
        staff_no: SAMPLE_ENTITIES.staff.idLabel,
        designation: SAMPLE_ENTITIES.staff.roleLabel,
        department: 'Science',
        date_of_joining: SAMPLE_ENTITIES.staff.dob,
        blood_group: SAMPLE_ENTITIES.staff.bloodGroup,
        gender: SAMPLE_ENTITIES.staff.gender,
        phone: SAMPLE_ENTITIES.staff.phone,
        mobile_no: SAMPLE_ENTITIES.staff.phone,
        mobile_number: SAMPLE_ENTITIES.staff.phone,
        address: SAMPLE_ENTITIES.staff.address,
        staff_photo_url: SAMPLE_PHOTO,
        student_photo_url: SAMPLE_PHOTO,
        school_logo_url: SAMPLE_LOGO,
        ...SAMPLE_SCHOOL,
    },
};

export default function CardDesigns({
    user,
    design,
    staffDesign,
    assignedTemplate,
    staffAssignedTemplate,
}: {
    user: any;
    design: DesignShape;
    staffDesign: DesignShape;
    assignedTemplate?: AssignedIdCardTemplate | null;
    staffAssignedTemplate?: AssignedIdCardTemplate | null;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [type, setType] = useState<CardType>('student');
    const [forms, setForms] = useState<Record<CardType, DesignShape>>(() => ({
        student: toShape(design),
        staff: toShape(staffDesign),
    }));
    const [processing, setProcessing] = useState(false);

    const form = forms[type];
    const activeTemplate = type === 'staff' ? staffAssignedTemplate : assignedTemplate;
    const cardLabel = type === 'staff' ? t('Staff ID Card') : t('Student ID Card');
    const templateEnabled = Boolean(activeTemplate && activeTemplate.content);
    const previewFaces = useMemo(
        () =>
            activeTemplate && templateEnabled
                ? idCardFaces(
                      activeTemplate,
                      withQrCode({ ...SAMPLE_CONTEXTS[type] }, SAMPLE_ENTITIES[type].qrToken),
                  )
                : [],
        [activeTemplate, templateEnabled, type],
    );

    const setField = (key: keyof DesignShape, value: DesignShape[keyof DesignShape]) => {
        setForms((current) => ({ ...current, [type]: { ...current[type], [key]: value } }));
    };

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const save = () => {
        setProcessing(true);
        router.patch(
            '/id-cards/designs',
            { ...form, type },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toast.success(t('ID card design saved.')),
                onError: () => toast.error(t('Failed to save ID card design.')),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <DashboardLayout user={user} activeTab="card-designs">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Card Designs')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {type === 'staff'
                                    ? t('Choose the layout and fields shown on staff ID cards.')
                                    : t('Choose the layout and fields shown on student ID cards.')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                                {(['student', 'staff'] as const).map((cardType) => (
                                    <button
                                        key={cardType}
                                        type="button"
                                        onClick={() => setType(cardType)}
                                        className={cn(
                                            'px-4 py-2 text-sm font-medium transition-colors',
                                            type === cardType
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-slate-600 hover:bg-slate-50'
                                        )}
                                    >
                                        {t(cardType === 'staff' ? 'Staff' : 'Student')}
                                    </button>
                                ))}
                            </div>
                            <Button onClick={save} disabled={processing} className="gap-2">
                                <Save className="h-4 w-4" />
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                        <div className="space-y-6">
                            {activeTemplate && activeTemplate.content ? (
                                <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                                    <div className="text-sm">
                                        <p className="font-medium text-indigo-900">
                                            {type === 'staff'
                                                ? t('A default template is assigned to Staff ID Cards.')
                                                : t('A default template is assigned to Student ID Cards.')}
                                        </p>
                                        <p className="mt-1 text-indigo-700">
                                            <span className="font-medium">{activeTemplate.title}</span>
                                            {t(' is now used for ID card previews and printing. The design below still applies when no default template is assigned.')}
                                        </p>
                                        <Link
                                            href="/template-assignments"
                                            className="mt-2 inline-flex items-center gap-1 font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
                                        >
                                            {t('Manage default templates')}
                                        </Link>
                                    </div>
                                </div>
                            ) : null}

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('Card Template')}</CardTitle>
                                    <CardDescription>
                                        {type === 'staff'
                                            ? t('Customize the staff ID card design.')
                                            : t('Customize the student ID card design.')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="card-layout">{t('Layout')}</Label>
                                        <Select
                                            value={form.layout}
                                            onValueChange={(value) =>
                                                setField('layout', value as IdCardDesign['layout'])
                                            }
                                        >
                                            <SelectTrigger id="card-layout">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="landscape">{t('Landscape')}</SelectItem>
                                                <SelectItem value="portrait">{t('Portrait')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="card-color">{t('Primary Color')}</Label>
                                        <Input
                                            id="card-color"
                                            type="color"
                                            value={form.primary_color}
                                            onChange={(event) => setField('primary_color', event.target.value)}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <CardTitle className="mb-3 text-sm">{t('Visible Fields')}</CardTitle>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {TOGGLE_KEYS.map((key) => (
                                                <label
                                                    key={key}
                                                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form[key]}
                                                        onChange={(event) => setField(key, event.target.checked)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                                    />
                                                    <span className="text-sm font-medium text-slate-800">
                                                        {t(TOGGLE_LABELS[type][key])}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="h-fit">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-indigo-600" />
                                    <CardTitle>{t('Live Preview')}</CardTitle>
                                </div>
                                <CardDescription>
                                    {templateEnabled && activeTemplate
                                        ? t('Preview shows the assigned default template on the next generated ID card.')
                                        : t('Preview shows the active design on the next generated ID card.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {templateEnabled && activeTemplate ? (
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-slate-600">
                                            {activeTemplate.title}
                                        </p>
                                        <div className="space-y-3">
                                            {previewFaces.map((face, index) => (
                                                <div key={index}>
                                                    {index > 0 && (
                                                        <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                                                            {t('Back')}
                                                        </p>
                                                    )}
                                                    <div
                                                        className="relative overflow-hidden rounded-sm border border-slate-300 bg-white"
                                                        style={{
                                                            width: `${face.widthMm}mm`,
                                                            height: `${face.heightMm}mm`,
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: face.html }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <CardFace
                                        design={form}
                                        entity={SAMPLE_ENTITIES[type]}
                                        orgName={user?.organization?.name ?? 'Gurukul Public School'}
                                        title={cardLabel}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}