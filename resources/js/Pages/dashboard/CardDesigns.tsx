import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CreditCard, Save } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import CardFace from '../../components/designer/CardFace';
import { IdCardDesign } from '../../components/designer/cardTypes';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const TOGGLES = [
    ['show_photo', 'Show student photo'],
    ['show_admission_no', 'Show admission number'],
    ['show_qr', 'Show QR code'],
    ['show_guardian', 'Show guardian name'],
    ['show_blood_group', 'Show blood group'],
    ['show_dob', 'Show date of birth'],
] as const;

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

export default function CardDesigns({ user, design }: { user: any; design: DesignShape }) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [form, setForm] = useState<DesignShape>({
        ...design,
        layout: (design.layout as IdCardDesign['layout']) || 'landscape',
    });
    const [processing, setProcessing] = useState(false);

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
        router.patch('/id-cards/designs', form, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(t('ID card design saved.')),
            onError: () => toast.error(t('Failed to save ID card design.')),
            onFinish: () => setProcessing(false),
        });
    };

    const sampleEntity = {
        name: 'Aarav Sharma',
        email: 'aarav@gurukul.com',
        phone: '9876543210',
        classLabel: 'Class 5-A',
        admissionNo: 'ADM-1024',
        gender: 'Male',
        bloodGroup: 'A+',
        dob: '10-05-2015',
        guardian: 'Ramesh Sharma',
        address: '12, Main Road, Nagpur',
        qrToken: `STU-${user?.organization_id ?? 0}-sample`,
    };

    return (
        <DashboardLayout user={user} activeTab="card-designs">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Card Designs')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Choose the layout and fields shown on student ID cards.')}
                            </p>
                        </div>
                        <Button onClick={save} disabled={processing} className="gap-2">
                            <Save className="h-4 w-4" />
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('Card Template')}</CardTitle>
                                    <CardDescription>{t('Customize the student ID card design.')}</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="card-layout">{t('Layout')}</Label>
                                        <Select
                                            value={form.layout}
                                            onValueChange={(value) =>
                                                setForm((c) => ({ ...c, layout: value as IdCardDesign['layout'] }))
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
                                            onChange={(event) =>
                                                setForm((c) => ({ ...c, primary_color: event.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <CardTitle className="mb-3 text-sm">{t('Visible Fields')}</CardTitle>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {TOGGLES.map(([key, label]) => (
                                                <label
                                                    key={key}
                                                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form[key as keyof DesignShape] as boolean}
                                                        onChange={(event) =>
                                                            setForm((c) => ({
                                                                ...c,
                                                                [key]: event.target.checked,
                                                            }))
                                                        }
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                                    />
                                                    <span className="text-sm font-medium text-slate-800">
                                                        {t(label)}
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
                                    {t('Preview shows the active design on the next generated ID card.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CardFace
                                    design={form}
                                    entity={sampleEntity}
                                    orgName={user?.organization?.name ?? 'Gurukul Public School'}
                                    title={t('Student ID Card')}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
