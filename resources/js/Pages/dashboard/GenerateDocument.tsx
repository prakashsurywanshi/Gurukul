import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { FileText, Info, Printer, Save, Download, Users, Grid3X3, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

interface ClassOption {
    id: number;
    name: string;
    section: string;
}

interface StudentOption {
    id: string;
    name: string;
    class: string;
    section: string;
    roll_number: string;
    admission_no: string;
}

interface TemplateOption {
    id: string;
    title: string;
    type: string;
    description: string;
}

const CARD_OPTIONS: Array<{ value: string; label: string; w: number | null; h: number | null }> = [
    { value: 'cr80_portrait', label: 'CR80 Portrait — 54 × 85.6 mm', w: 54, h: 85.6 },
    { value: 'cr80_landscape', label: 'CR80 Landscape — 85.6 × 54 mm', w: 85.6, h: 54 },
    { value: 'a7_badge', label: 'A7 Badge — 74 × 105 mm', w: 74, h: 105 },
    { value: 'a6_portrait', label: 'A6 Portrait — 105 × 148 mm', w: 105, h: 148 },
    { value: 'a6_landscape', label: 'A6 Landscape — 148 × 105 mm', w: 148, h: 105 },
];

const PAPER_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'a4', label: 'A4 (210 × 297 mm)' },
    { value: 'a3', label: 'A3 (297 × 420 mm)' },
    { value: 'letter', label: 'Letter (8.5 × 11 in)' },
    { value: 'legal', label: 'Legal (8.5 × 14 in)' },
];

export default function GenerateDocument({
    user,
    schoolName,
    classes,
    students,
    templates,
}: {
    user: any;
    schoolName: string;
    classes: ClassOption[];
    students: StudentOption[];
    templates: TemplateOption[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};

    const [step, setStep] = useState(1);
    const [classId, setClassId] = useState<string>('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [wholeSection, setWholeSection] = useState(true);
    const [templateId, setTemplateId] = useState<string>('');
    const [layout, setLayout] = useState<'certificate' | 'id_grid'>('id_grid');
    const [archive, setArchive] = useState(true);
    const [card, setCard] = useState('cr80_portrait');
    const [customW, setCustomW] = useState('54');
    const [customH, setCustomH] = useState('85.6');
    const [paper, setPaper] = useState('a4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [margin, setMargin] = useState('5');
    const [gap, setGap] = useState('2');
    const [cutMarks, setCutMarks] = useState(true);
    const [alignCenter, setAlignCenter] = useState(false);
    const [duplexType, setDuplexType] = useState('front_only');
    const [archiving, setArchiving] = useState(false);
    const previewWindow = useRef<Window | null>(null);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const studentsInClass = classId
        ? students.filter((student) => student.class === classes.find((c) => String(c.id) === classId)?.name)
        : [];

    const audienceStudents =
        wholeSection || selectedStudents.length === 0 ? studentsInClass.map((student) => student.id) : selectedStudents;

    const buildPreviewUrl = (viewPath: string = '/documents/generate/preview') => {
        const params = new URLSearchParams();

        if (!classId) return null;

        params.set('class', classId);

        if (!wholeSection && selectedStudents.length > 0) {
            params.set('students', selectedStudents.join(','));
        }

        if (templateId) {
            params.set('template', templateId);
        }

        params.set('layout', layout);
        params.set('card', card);

        if (card === 'custom') {
            params.set('w', customW);
            params.set('h', customH);
        }

        params.set('paper', paper);
        params.set('orientation', orientation);
        params.set('margin', margin);
        params.set('gap', gap);
        params.set('cut_marks', cutMarks ? '1' : '0');
        params.set('align_center', alignCenter ? '1' : '0');
        params.set('duplex_type', duplexType);

        return `/documents/generate/preview?${params.toString()}`;
    };

    const openPreview = () => {
        const url = buildPreviewUrl();

        if (!url) {
            toast.error(t('Select a class first.'));
            return;
        }

        if (previewWindow.current && !previewWindow.current.closed) {
            previewWindow.current.close();
        }

        previewWindow.current = window.open(url, '_blank');
    };

    const generatePdf = () => {
        const url = buildPreviewUrl();

        if (!url) {
            toast.error(t('Select a class first.'));
            return;
        }

        if (archive) {
            setArchiving(true);
            router.post(
                '/documents/generate/archive',
                {
                    class: Number(classId),
                    students: wholeSection || selectedStudents.length === 0 ? '' : selectedStudents.join(','),
                    template: Number(templateId),
                    date: new Date().toISOString().slice(0, 10),
                },
                {
                    preserveScroll: true,
                    onError: () => {
                        toast.error(t('Failed to archive the document.'));
                        setArchiving(false);
                    },
                    onFinish: () => {
                        setArchiving(false);
                        openPreview();
                    },
                },
            );

            return;
        }

        openPreview();
    };

    const downloadServerPdf = () => {
        const url = buildPreviewUrl('/documents/generate/pdf');

        if (!url) {
            toast.error(t('Select a class first.'));
            return;
        }

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    };

    const templateSelected = templates.find((template) => template.id === templateId);

    return (
        <DashboardLayout user={user} activeTab="generate-document">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{t('Certificates & Documents')}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {t('Print certificates id cards for your students')}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.visit('/certificates')}>
                            <ArrowLeft className="h-4 w-4" />
                            {t('Back to Templates')}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        {[1, 2, 3].map((number) => (
                            <div key={number} className="flex items-center gap-2">
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                        step >= number ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}
                                >
                                    {step > number ? <Check className="h-3 w-3" /> : number}
                                </div>
                                <span className={step >= number ? 'font-medium text-slate-900' : 'text-slate-500'}>
                                    {number === 1
                                        ? t('Who is this for?')
                                        : number === 2
                                          ? t('Choose a design')
                                          : t('Sheet cutting setup')}
                                </span>
                                {number < 3 ? <ArrowRight className="h-4 w-4 text-slate-300" /> : null}
                            </div>
                        ))}
                    </div>

                    {step === 1 ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    {t('Who is this for?')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Pick a class section, then a single student or the whole section.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{t('Class')}</Label>
                                        <Select
                                            value={classId}
                                            onValueChange={(value) => {
                                                setClassId(value);
                                                setWholeSection(true);
                                                setSelectedStudents([]);
                                            }}
                                        >
                                            <SelectTrigger id="gen-class-select">
                                                <SelectValue placeholder={t('Select class...')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.map((schoolClass) => (
                                                    <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                                                        {schoolClass.name}
                                                        {schoolClass.section ? ` - ${schoolClass.section}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Student')}</Label>
                                        {classId ? (
                                            <Select
                                                value={
                                                    wholeSection || selectedStudents.length === 0
                                                        ? ''
                                                        : selectedStudents[0]
                                                }
                                                onValueChange={(value) => {
                                                    setWholeSection(false);
                                                    setSelectedStudents(value ? [value] : []);
                                                }}
                                            >
                                                <SelectTrigger id="gen-student-select">
                                                    <SelectValue
                                                        placeholder={
                                                            wholeSection ? t('Whole section') : t('Select student...')
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {studentsInClass.map((student) => (
                                                        <SelectItem key={student.id} value={student.id}>
                                                            {student.name} ·{' '}
                                                            {student.roll_number || student.admission_no}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                                                {t('Select a class first')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="whole-section"
                                        checked={wholeSection}
                                        onCheckedChange={(checked) => setWholeSection(checked === true)}
                                    />
                                    <Label htmlFor="whole-section">{t('Whole class')}</Label>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {t('Target')}:{' '}
                                    <strong>{classId ? `${audienceStudents.length} ${t('students')}` : '-'}</strong>
                                </p>
                                <div className="flex justify-end">
                                    <Button onClick={() => setStep(2)} disabled={!classId} className="gap-2">
                                        {t('Next')}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {step === 2 ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {t('Choose a design')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Select a template and how it should be laid out.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Template')}</Label>
                                    <Select value={templateId} onValueChange={setTemplateId}>
                                        <SelectTrigger id="gen-template-select">
                                            <SelectValue placeholder={t('Select template...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((template) => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {templateSelected ? (
                                    <p className="text-xs text-slate-500">{templateSelected.description}</p>
                                ) : null}
                                <div className="space-y-2">
                                    <Label>{t('Layout')}</Label>
                                    <RadioGroup
                                        value={layout}
                                        onValueChange={(value) => setLayout(value as 'certificate' | 'id_grid')}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="id_grid" id="layout-grid" />
                                            <Label htmlFor="layout-grid" className="flex items-center gap-1">
                                                <Grid3X3 className="h-4 w-4" />
                                                {t('ID Card Grid')}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="certificate" id="layout-certificate" />
                                            <Label htmlFor="layout-certificate" className="flex items-center gap-1">
                                                <FileText className="h-4 w-4" />
                                                {t('Certificate Templates')}
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="archive-copy"
                                        checked={archive}
                                        onCheckedChange={(checked) => setArchive(checked === true)}
                                    />
                                    <div>
                                        <Label htmlFor="archive-copy">{t('Archive a digital copy')}</Label>
                                        <p className="text-xs text-slate-500">
                                            {t('Saves an exact replica for future auditing and re-downloads.')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <Button variant="outline" onClick={() => setStep(1)}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>
                                    <Button
                                        onClick={() => setStep(3)}
                                        disabled={!templateId || !classId}
                                        className="gap-2"
                                    >
                                        {t('Next')}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {step === 3 ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    {t('Sheet cutting setup')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Fine-tune the paper, card size and cut marks. Sensible defaults are ready.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{t('Card Size')}</Label>
                                    <Select
                                        value={card}
                                        onValueChange={(value) => {
                                            setCard(value);
                                            const option = CARD_OPTIONS.find((item) => item.value === value);
                                            if (option?.w) setCustomW(String(option.w));
                                            if (option?.h) setCustomH(String(option.h));
                                        }}
                                    >
                                        <SelectTrigger id="gen-card-select">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CARD_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('Paper')}</Label>
                                        <Select value={paper} onValueChange={setPaper}>
                                            <SelectTrigger id="gen-paper-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAPER_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Sheet Orientation')}</Label>
                                        <RadioGroup
                                            value={orientation}
                                            onValueChange={(value) => setOrientation(value as 'portrait' | 'landscape')}
                                            className="flex gap-4 pt-2"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="portrait" id="orient-portrait" />
                                                <Label htmlFor="orient-portrait">{t('Portrait')}</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="landscape" id="orient-landscape" />
                                                <Label htmlFor="orient-landscape">{t('Landscape')}</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label>{t('Margin (mm)')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={margin}
                                            onChange={(event) => setMargin(event.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Gap (mm)')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={gap}
                                            onChange={(event) => setGap(event.target.value)}
                                        />
                                    </div>
                                    {card === 'custom' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('W (mm)')}</Label>
                                                <Input
                                                    type="number"
                                                    min={10}
                                                    max={600}
                                                    value={customW}
                                                    onChange={(event) => setCustomW(event.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('H (mm)')}</Label>
                                                <Input
                                                    type="number"
                                                    min={10}
                                                    max={600}
                                                    value={customH}
                                                    onChange={(event) => setCustomH(event.target.value)}
                                                />
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="cut-marks"
                                            checked={cutMarks}
                                            onCheckedChange={(checked) => setCutMarks(checked === true)}
                                        />
                                        <Label htmlFor="cut-marks">{t('Cut marks')}</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="align-center"
                                            checked={alignCenter}
                                            onCheckedChange={(checked) => setAlignCenter(checked === true)}
                                        />
                                        <Label htmlFor="align-center">{t('Align center')}</Label>
                                    </div>
                                </div>

                                {layout === 'id_grid' ? (
                                    <div className="space-y-2">
                                        <Label>{t('Cut stack order')}</Label>
                                        <RadioGroup
                                            value={duplexType}
                                            onValueChange={setDuplexType}
                                            className="flex flex-col gap-2"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="front_only" id="duplex-front" />
                                                <Label htmlFor="duplex-front">{t('Front only')}</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="long_edge" id="duplex-long" />
                                                <Label htmlFor="duplex-long">
                                                    {t('Duplex — flip on long edge (interleaved sheets)')}
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="side_by_side" id="duplex-side" />
                                                <Label htmlFor="duplex-side">{t('Side by side — fold / glue')}</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                ) : null}

                                <p className="text-xs text-slate-500">
                                    {t('Cards are tiled edge-accurate; content auto-scales to fit each card.')}
                                </p>

                                <div className="flex flex-wrap justify-between gap-3">
                                    <Button variant="outline" onClick={() => setStep(2)}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={openPreview} className="gap-2">
                                            <Printer className="h-4 w-4" />
                                            {t('Print Preview')}
                                        </Button>
                                        <Button variant="outline" onClick={downloadServerPdf} className="gap-2">
                                            <Download className="h-4 w-4" />
                                            {t('Download PDF')}
                                        </Button>
                                        <Button onClick={generatePdf} disabled={archiving} className="gap-2">
                                            <Save className="h-4 w-4" />
                                            {archiving ? t('Preparing...') : t('Generate PDF')}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            </div>
        </DashboardLayout>
    );
}
