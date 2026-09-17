import { useLanguage } from '../../i18n/LanguageProvider';
import { ChangeEvent, FormEvent, createContext, useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { Globe, Image as ImageIcon, LayoutTemplate, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import {
    mergeRegionalOverrides,
    normalizeWebsiteCmsContent,
    normalizeWebsiteContent,
    WebsiteCmsContent,
    WebsiteContent,
    websiteThemes,
    WebsiteTemplateKey,
    WebsiteThemeKey,
} from '../../utils/websiteCmsContent';
import { TemplateCardSelector, WebsiteThemeSelector } from '../../components/WebsiteThemePreviewCard';

interface WebsiteCmsProps {
    user: any;
    websiteContent?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null;
}

type TemplateSectionKey = 'template1' | 'template2' | 'template3' | 'template4' | 'template5';

type FieldConfig = {
    key: string;
    label: string;
    rows?: number;
};

type ArrayFieldConfig = {
    key: string;
    label: string;
    rows?: number;
};

type ArrayEditorProps = {
    title: string;
    description: string;
    items: Array<Record<string, string>>;
    fields: Array<ArrayFieldConfig>;
    onChange: (index: number, field: string, value: string) => void;
};

const templateOptions: Array<{
    key: WebsiteTemplateKey;
    label: string;
    description: string;
}> = [
    {
        key: 'template1',
        label: 'Template 1 - Classic Admissions',
        description: 'Admissions-first homepage with spotlight, outcomes, FAQ, and full campus storytelling.',
    },
    {
        key: 'template2',
        label: 'Template 2 - 3D Modern',
        description: 'Motion-heavy homepage with 3D slides, gallery storytelling, and contact conversion.',
    },
    {
        key: 'template3',
        label: 'Template 3 - Heritage Editorial',
        description: 'Classic premium school layout with elegant hero, editorial sections, and admissions flow.',
    },
    {
        key: 'template4',
        label: 'Template 4 - Colorful Classic School',
        description:
            'Classic school website with top contact bar, colorful tabs, gallery, events, contact, and admissions flow.',
    },
    {
        key: 'template5',
        label: 'Template 5 - Classic Institutional',
        description:
            'Classic institutional layout with navy & blue theme, mega menu, principal messages, departments, and gallery.',
    },
];

const sharedFields: Array<FieldConfig> = [
    { key: 'seoTitle', label: 'SEO title' },
    {
        key: 'brandSubtitle',
        label: 'Subtitle / Tagline (shown below school name)',
    },
    { key: 'navAbout', label: 'Navigation: About' },
    { key: 'navPrograms', label: 'Navigation: Programs' },
    { key: 'navCampus', label: 'Navigation: Campus' },
    { key: 'navAdmissions', label: 'Navigation: Admissions' },
    { key: 'navGallery', label: 'Navigation: Gallery' },
    { key: 'navContact', label: 'Navigation: Contact' },
    { key: 'loginLabel', label: 'Login button label' },
    { key: 'applyNowLabel', label: 'Apply button label' },
];

const templateHeroFields: Array<FieldConfig> = [
    { key: 'heroBadge', label: 'Hero badge' },
    { key: 'heroTitleLineOne', label: 'Hero title line one', rows: 3 },
    { key: 'heroTitleAccent', label: 'Hero title accent', rows: 3 },
    { key: 'heroDescription', label: 'Hero description', rows: 4 },
    { key: 'heroPrimaryCta', label: 'Hero primary CTA' },
    { key: 'heroSecondaryCta', label: 'Hero secondary CTA' },
];

const templateAdmissionsFields: Array<FieldConfig> = [
    { key: 'admissionsEyebrow', label: 'Admissions eyebrow' },
    { key: 'admissionsTitle', label: 'Admissions title', rows: 3 },
    { key: 'admissionsDescription', label: 'Admissions description', rows: 4 },
    { key: 'admissionsPointOne', label: 'Admissions point one', rows: 3 },
    { key: 'admissionsPointTwo', label: 'Admissions point two', rows: 3 },
    { key: 'admissionsEmail', label: 'Admissions email' },
    { key: 'admissionsContactButton', label: 'Admissions contact button' },
    { key: 'admissionsPortalButton', label: 'Admissions portal button' },
    { key: 'admissionsFormTitle', label: 'Form title' },
    { key: 'admissionsFormIntro', label: 'Form intro', rows: 3 },
];

const templateFourTopFields: Array<FieldConfig> = [
    { key: 'templateFourTopPhone', label: 'Top header phone' },
    { key: 'templateFourTopEmail', label: 'Top header email' },
    { key: 'templateFourTopAddress', label: 'Top header address', rows: 3 },
];

const templateFourHeroFields: Array<FieldConfig> = [
    { key: 'templateFourHeroEyebrow', label: 'Hero eyebrow' },
    { key: 'templateFourHeroTitle', label: 'Hero title', rows: 3 },
    { key: 'templateFourHeroDescription', label: 'Hero description', rows: 4 },
    { key: 'templateFourHeroPrimaryCta', label: 'Hero primary CTA' },
    { key: 'templateFourHeroSecondaryCta', label: 'Hero secondary CTA' },
    { key: 'templateFourNoticeLabel', label: 'Notice label' },
    { key: 'templateFourNoticeText', label: 'Notice text', rows: 3 },
];

const templateFourAboutFields: Array<FieldConfig> = [
    { key: 'templateFourAboutTitle', label: 'About title', rows: 3 },
    {
        key: 'templateFourAboutDescription',
        label: 'About description',
        rows: 4,
    },
];

const templateFourGalleryFields: Array<FieldConfig> = [
    { key: 'templateFourGalleryTitle', label: 'Gallery title', rows: 3 },
    {
        key: 'templateFourGalleryDescription',
        label: 'Gallery description',
        rows: 4,
    },
];

const templateFourEventsFields: Array<FieldConfig> = [
    { key: 'templateFourEventsTitle', label: 'Events title', rows: 3 },
    {
        key: 'templateFourEventsDescription',
        label: 'Events description',
        rows: 4,
    },
];

const templateFourContactFields: Array<FieldConfig> = [
    { key: 'templateFourContactTitle', label: 'Contact title', rows: 3 },
    {
        key: 'templateFourContactDescription',
        label: 'Contact description',
        rows: 4,
    },
    { key: 'templateFourMapEmbedUrl', label: 'Map embed URL', rows: 3 },
];

function getTemplateLabel(template: WebsiteTemplateKey) {
    return templateOptions.find((option) => option.key === template)?.label ?? templateOptions[0].label;
}

function getPreviewEyebrow(content: WebsiteContent) {
    if (content.activeTemplate === 'template2') {
        return content.templateTwoHeroEyebrow;
    }

    if (content.activeTemplate === 'template4') {
        return content.templateFourHeroEyebrow;
    }

    if (content.activeTemplate === 'template5') {
        return content.templateFiveHeroSubtitle;
    }

    return content.heroBadge;
}

function getPreviewTitle(content: WebsiteContent) {
    if (content.activeTemplate === 'template2') {
        return content.templateTwoHeroTitle;
    }

    if (content.activeTemplate === 'template4') {
        return content.templateFourHeroTitle;
    }

    if (content.activeTemplate === 'template5') {
        return content.templateFiveHeroTitle;
    }

    return `${content.heroTitleLineOne} ${content.heroTitleAccent}`.trim();
}

function getPreviewDescription(content: WebsiteContent) {
    if (content.activeTemplate === 'template2') {
        return content.templateTwoHeroDescription;
    }

    if (content.activeTemplate === 'template4') {
        return content.templateFourHeroDescription;
    }

    if (content.activeTemplate === 'template5') {
        return content.templateFiveHeroDescription;
    }

    return content.heroDescription;
}

function ArrayEditor({ title, description, items, fields, onChange }: ArrayEditorProps) {
    const { t } = useLanguage();
    const regionalLanguage = useRegionalLanguage();

    return (
        <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-[var(--foreground)]">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {regionalLanguage ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                        {t('Editing')}
                        {LANGUAGE_NAMES[regionalLanguage] ?? regionalLanguage}
                        {t('translations. English content stays unchanged.')}
                    </div>
                ) : null}
                {items.map((item, index) => (
                    <div
                        key={`${title}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--secondary)]"
                    >
                        <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-[var(--foreground)]">
                            {title} {index + 1}
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            {fields.map((field) => {
                                const { t } = useLanguage();
                                return (
                                    <div
                                        key={`${title}-${index}-${field.key}`}
                                        className={field.rows ? 'md:col-span-2 space-y-2' : t('space-y-2')}
                                    >
                                        <Label>{t(field.label)}</Label>
                                        {field.rows ? (
                                            <Textarea
                                                rows={field.rows}
                                                value={item[field.key] ?? ''}
                                                onChange={(event) => onChange(index, field.key, event.target.value)}
                                            />
                                        ) : (
                                            <Input
                                                value={item[field.key] ?? ''}
                                                onChange={(event) => onChange(index, field.key, event.target.value)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

type RegionalLanguage = 'mr' | 'hi' | '';

const RegionalLanguageContext = createContext<RegionalLanguage>('');

const useRegionalLanguage = () => useContext(RegionalLanguageContext);

const LANGUAGE_NAMES: Record<string, string> = {
    mr: 'मराठी',
    hi: 'हिन्दी',
};

function FieldGrid({
    title,
    description,
    data,
    fields,
    onChange,
}: {
    title: string;
    description: string;
    data: Record<string, string>;
    fields: Array<FieldConfig>;
    onChange: (key: string, value: string) => void;
}) {
    const regionalLanguage = useRegionalLanguage();

    const renderInput = (fieldKey: string, value: string, rows?: number) =>
        rows ? (
            <Textarea rows={rows} value={value ?? ''} onChange={(event) => onChange(fieldKey, event.target.value)} />
        ) : (
            <Input value={value ?? ''} onChange={(event) => onChange(fieldKey, event.target.value)} />
        );

    return (
        <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-[var(--foreground)]">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => {
                    const { t } = useLanguage();
                    return (
                        <div key={field.key} className={field.rows ? 'md:col-span-2 space-y-2' : t('space-y-2')}>
                            <Label>{t(field.label)}</Label>
                            {renderInput(field.key, data[field.key], field.rows)}
                            {regionalLanguage ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-[var(--secondary)]">
                                    <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                        {LANGUAGE_NAMES[regionalLanguage] ?? regionalLanguage}
                                        {t('translation')}
                                    </Label>
                                    {renderInput(
                                        `${field.key}_${regionalLanguage}`,
                                        data[`${field.key}_${regionalLanguage}`],
                                        field.rows,
                                    )}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

function TemplatePreviewCard({
    label,
    description,
    content,
}: {
    label: string;
    description: string;
    content: WebsiteContent;
}) {
    const { t } = useLanguage();
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-lg font-semibold text-slate-900">{label}</p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{content.theme}</Badge>
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.24em] text-slate-500">{getPreviewEyebrow(content)}</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">{getPreviewTitle(content)}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{getPreviewDescription(content)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('Highlights')}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{content.highlights.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('Slider Images')}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{content.sliderImages.length}</p>
                </div>
            </div>
        </div>
    );
}

export default function WebsiteCms({ user, websiteContent }: WebsiteCmsProps) {
    const { t } = useLanguage();
    const [content, setContent] = useState<WebsiteCmsContent>(() =>
        mergeRegionalOverrides(normalizeWebsiteCmsContent(websiteContent), websiteContent),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingSliderImage, setIsUploadingSliderImage] = useState(false);
    const [deletingSliderImageIndex, setDeletingSliderImageIndex] = useState<number | null>(null);
    const [regionalLanguage, setRegionalLanguage] = useState<RegionalLanguage>('');

    const templateOnePreview = useMemo(() => normalizeWebsiteContent(content, 'template1'), [content]);
    const templateTwoPreview = useMemo(() => normalizeWebsiteContent(content, 'template2'), [content]);
    const templateThreePreview = useMemo(() => normalizeWebsiteContent(content, 'template3'), [content]);
    const templateFourPreview = useMemo(() => normalizeWebsiteContent(content, 'template4'), [content]);
    const templateFivePreview = useMemo(() => normalizeWebsiteContent(content, 'template5'), [content]);

    const updateSharedField = (key: string, value: string) => {
        setContent((current) => ({
            ...current,
            shared: {
                ...current.shared,
                [key]: value,
            },
        }));
    };

    const updateTemplateField = (template: TemplateSectionKey, key: string, value: string) => {
        setContent((current) => ({
            ...current,
            [template]: {
                ...current[template],
                [key]: value,
            },
        }));
    };

    const getTemplateArray = (template: TemplateSectionKey, key: string): Array<Record<string, string>> => {
        const regionalKey = regionalLanguage ? `${key}_${regionalLanguage}` : key;
        const regionalValue = content[template][regionalKey] as Array<Record<string, string>> | undefined;

        if (regionalLanguage && Array.isArray(regionalValue) && regionalValue.length > 0) {
            return regionalValue;
        }

        return (content[template][key] as Array<Record<string, string>>) ?? [];
    };

    const updateTemplateArrayItem = (
        template: TemplateSectionKey,
        key: string,
        index: number,
        field: string,
        value: string,
    ) => {
        setContent((current) => {
            const suffix = regionalLanguage ? `_${regionalLanguage}` : '';
            const targetKey = `${key}${suffix}`;
            const source = Array.isArray(current[template][targetKey])
                ? (current[template][targetKey] as Array<Record<string, string>>)
                : ((current[template][key] as Array<Record<string, string>>) ?? []);

            const nextItems = source.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            );

            return {
                ...current,
                [template]: {
                    ...current[template],
                    [targetKey]: nextItems,
                },
            };
        });
    };

    const handleSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);

        router.patch('/website-cms', content, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Website CMS saved with separate template content.');
            },
            onError: () => {
                toast.error('Website CMS could not be saved.');
            },
            onFinish: () => {
                setIsSaving(false);
            },
        });
    };

    const handleSliderImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        setIsUploadingSliderImage(true);

        try {
            const formData = new FormData();
            formData.append('slider_image', file);

            const response = await axios.post('/website-cms/slider-images', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setContent((current) => ({
                ...current,
                sliderImages: response.data.sliderImages ?? current.sliderImages,
            }));
            toast.success(response.data.message || 'Slider image uploaded successfully.');
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.slider_image?.[0] ||
                'Slider image could not be uploaded.';

            toast.error(message);
        } finally {
            setIsUploadingSliderImage(false);
        }
    };

    const handleSliderImageDelete = async (index: number) => {
        setDeletingSliderImageIndex(index);

        try {
            const response = await axios.delete(`/website-cms/slider-images/${index}`);

            setContent((current) => ({
                ...current,
                sliderImages: response.data.sliderImages ?? current.sliderImages,
            }));
            toast.success(response.data.message || 'Slider image deleted successfully.');
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Slider image could not be deleted.';
            toast.error(message);
        } finally {
            setDeletingSliderImageIndex(null);
        }
    };

    return (
        <DashboardLayout user={user} activeTab="website-cms">
            <form onSubmit={handleSave} className="min-h-full bg-slate-50 p-8 dark:bg-[var(--background)]">
                <div className="mx-auto max-w-7xl space-y-6">
                    <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-[var(--foreground)]">
                                <Globe className="h-5 w-5 text-blue-600" />
                                {t('Publish Controls')}
                            </CardTitle>
                            <CardDescription>
                                {t('Choose the active template and save all website CMS sections.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-[var(--secondary)]">
                                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                                    {t('Website brand')}
                                </p>
                                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-[var(--foreground)]">
                                    {content.shared.brandName}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('Active website template')}</Label>
                                <TemplateCardSelector
                                    activeTemplate={content.activeTemplate}
                                    onSelect={(template) =>
                                        setContent((current) => ({
                                            ...current,
                                            activeTemplate: template,
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('Theme')}</Label>
                                    <Select
                                        value={content.theme}
                                        onValueChange={(value: WebsiteThemeKey) =>
                                            setContent((current) => ({
                                                ...current,
                                                theme: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select theme')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(websiteThemes).map(([key, theme]) => (
                                                <SelectItem key={key} value={key}>
                                                    {theme.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Active template')}</Label>
                                    <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-900/20">
                                        <p className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                                            {getTemplateLabel(content.activeTemplate)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
                                <p className="text-sm text-indigo-700 dark:text-indigo-300">{t('Public theme')}</p>
                                <p className="mt-2 text-xl font-semibold text-indigo-900 dark:text-indigo-100">
                                    {websiteThemes[content.theme].name}
                                </p>
                                <p className="mt-1 text-sm text-indigo-700/80 dark:text-indigo-300/80">
                                    {t(websiteThemes[content.theme].description)}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('Edit regional translations')}</Label>
                                <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-[var(--border)]">
                                    {(['', 'mr', 'hi'] as RegionalLanguage[]).map((code) => (
                                        <button
                                            key={code || t('en')}
                                            type="button"
                                            onClick={() => setRegionalLanguage(code)}
                                            className={`px-4 py-2 text-sm font-medium transition ${
                                                regionalLanguage === code
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-slate-600 dark:bg-[var(--secondary)] dark:text-[var(--foreground)]'
                                            }`}
                                        >
                                            {code === '' ? t('English') : LANGUAGE_NAMES[code]}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                                    {t(
                                        'When a regional language is selected, every field also shows its translation input. The public website switches to the regional text when that language is chosen.',
                                    )}
                                </p>
                            </div>

                            <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                                <Save className="h-4 w-4" />
                                {isSaving ? t('Saving...') : t('Save Website CMS')}
                            </Button>

                            <a
                                href="/website-cms/editor"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            >
                                <Globe className="h-4 w-4" />
                                {t('Open Visual Editor (')}
                                {content.activeTemplate?.replace('template', 'Template ') || t('Template 1')})
                            </a>
                        </CardContent>
                    </Card>

                    <RegionalLanguageContext.Provider value={regionalLanguage}>
                        <Tabs defaultValue="shared" className="space-y-6">
                            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-white p-2 shadow-sm dark:bg-[var(--card)] dark:border dark:border-[var(--border)]">
                                <TabsTrigger
                                    value="shared"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Shared CMS')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="template1"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Template 1')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="template2"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Template 2')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="template3"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Template 3')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="template4"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Template 4')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="template5"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Template 5')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="preview"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    {t('Preview')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="shared" className="space-y-6">
                                <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-[var(--foreground)]">
                                            <LayoutTemplate className="h-5 w-5 text-blue-600" />
                                            {t('Shared Website Settings')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('These values are reused across all templates.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-[var(--secondary)]">
                                            <p className="text-sm text-slate-500 dark:text-[var(--muted-foreground)]">
                                                {t('Website brand')}
                                            </p>
                                            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-[var(--foreground)]">
                                                {content.shared.brandName}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('Active website template')}</Label>
                                            <TemplateCardSelector
                                                activeTemplate={content.activeTemplate}
                                                onSelect={(template) =>
                                                    setContent((current) => ({
                                                        ...current,
                                                        activeTemplate: template,
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('Theme')}</Label>
                                            <Select
                                                value={content.theme}
                                                onValueChange={(value: WebsiteThemeKey) =>
                                                    setContent((current) => ({
                                                        ...current,
                                                        theme: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select theme')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(websiteThemes).map(([key, theme]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {theme.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-900/20">
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                {t('Active template')}
                                            </p>
                                            <p className="mt-2 text-xl font-semibold text-blue-900 dark:text-blue-100">
                                                {getTemplateLabel(content.activeTemplate)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
                                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                                {t('Public theme')}
                                            </p>
                                            <p className="mt-2 text-xl font-semibold text-indigo-900 dark:text-indigo-100">
                                                {websiteThemes[content.theme].name}
                                            </p>
                                            <p className="mt-1 text-sm text-indigo-700/80 dark:text-indigo-300/80">
                                                {t(websiteThemes[content.theme].description)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <FieldGrid
                                    title={t('Shared Brand, SEO, and Navigation')}
                                    description={t('Update common branding and navigation labels once for all templates.')}
                                    data={content.shared as Record<string, string>}
                                    fields={sharedFields}
                                    onChange={updateSharedField}
                                />

                                <Card className="border-slate-200 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-[var(--foreground)]">
                                            <ImageIcon className="h-5 w-5 text-blue-600" />
                                            {t('Shared Slider Images')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('These images can be reused by the homepage templates.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <Label
                                                htmlFor="slider-image-upload"
                                                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {isUploadingSliderImage ? t('Uploading...') : t('Upload Slider Image')}
                                            </Label>
                                            <input
                                                id="slider-image-upload"
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                                className="hidden"
                                                onChange={handleSliderImageUpload}
                                            />

                                            <p className="text-sm text-slate-500">
                                                {content.sliderImages.length}
                                                {t('image(s) available')}
                                            </p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            {content.sliderImages.map((image, index) => (
                                                <div
                                                    key={image}
                                                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                                                >
                                                    <img
                                                        src={image}
                                                        alt={`Slider ${index + 1}`}
                                                        className="h-52 w-full object-cover"
                                                    />

                                                    <div className="flex items-center justify-between p-4">
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {t('Image')}
                                                            {index + 1}
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2"
                                                            disabled={deletingSliderImageIndex === index}
                                                            onClick={() => handleSliderImageDelete(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            {deletingSliderImageIndex === index
                                                                ? t('Deleting...')
                                                                : t('Delete')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="template1" className="space-y-6">
                                <FieldGrid
                                    title={t('Template 1 Hero')}
                                    description="Template 1 keeps the classic homepage hero and first screen messaging."
                                    data={content.template1 as Record<string, string>}
                                    fields={templateHeroFields}
                                    onChange={(key, value) => updateTemplateField('template1', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 1 Highlights')}
                                    description="Homepage top metrics for Template 1."
                                    items={getTemplateArray('template1', 'highlights')}
                                    fields={[
                                        { key: 'value', label: 'Value' },
                                        { key: 'label', label: 'Label' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'highlights', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 1 Spotlight and About')}
                                    description="Campus spotlight, open house, and about section copy."
                                    data={content.template1 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'featureEyebrow',
                                            label: 'Spotlight eyebrow',
                                        },
                                        {
                                            key: 'featureTitle',
                                            label: 'Spotlight title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'openHouseLabel',
                                            label: 'Open house label',
                                        },
                                        {
                                            key: 'openHouseDescription',
                                            label: 'Open house description',
                                            rows: 3,
                                        },
                                        {
                                            key: 'openHouseDate',
                                            label: 'Open house date',
                                        },
                                        {
                                            key: 'liveOverviewValue',
                                            label: 'Live overview value',
                                        },
                                        {
                                            key: 'liveOverviewLabel',
                                            label: 'Live overview label',
                                            rows: 2,
                                        },
                                        {
                                            key: 'aboutEyebrow',
                                            label: 'About eyebrow',
                                        },
                                        {
                                            key: 'aboutTitle',
                                            label: 'About title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'aboutDescription',
                                            label: 'About description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template1', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 1 Features')}
                                    description={t('Feature cards used in the classic admissions layout.')}
                                    items={getTemplateArray('template1', 'features')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'features', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 1 Pillars')}
                                    description={t('Core trust and campus support points.')}
                                    items={getTemplateArray('template1', 'pillars')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'text', label: 'Text', rows: 3 },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'pillars', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 1 Programs')}
                                    description="Academic journey section for Template 1."
                                    data={content.template1 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'programsEyebrow',
                                            label: 'Programs eyebrow',
                                        },
                                        {
                                            key: 'programsTitle',
                                            label: 'Programs title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'programsDescription',
                                            label: 'Programs description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template1', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 1 Programs List')}
                                    description={t('Program cards for the classic homepage.')}
                                    items={getTemplateArray('template1', 'programs')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'age', label: 'Stage / Age' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'programs', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 1 Campus, Outcomes, Journey, and Visit')}
                                    description={t('Main editorial sections for campus life and admissions storytelling.')}
                                    data={content.template1 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'campusEyebrow',
                                            label: 'Campus eyebrow',
                                        },
                                        {
                                            key: 'campusTitle',
                                            label: 'Campus title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'campusDescription',
                                            label: 'Campus description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'newsEyebrow',
                                            label: 'News eyebrow',
                                        },
                                        {
                                            key: 'outcomesEyebrow',
                                            label: 'Outcomes eyebrow',
                                        },
                                        {
                                            key: 'outcomesTitle',
                                            label: 'Outcomes title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'outcomesDescription',
                                            label: 'Outcomes description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'journeyEyebrow',
                                            label: 'Journey eyebrow',
                                        },
                                        {
                                            key: 'journeyTitle',
                                            label: 'Journey title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'journeyDescription',
                                            label: 'Journey description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'voicesEyebrow',
                                            label: 'Testimonials eyebrow',
                                        },
                                        {
                                            key: 'voicesTitle',
                                            label: 'Testimonials title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitEyebrow',
                                            label: 'Visit eyebrow',
                                        },
                                        {
                                            key: 'visitTitle',
                                            label: 'Visit title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPointOneTitle',
                                            label: 'Visit point one title',
                                        },
                                        {
                                            key: 'visitPointOneText',
                                            label: 'Visit point one text',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPointTwoTitle',
                                            label: 'Visit point two title',
                                        },
                                        {
                                            key: 'visitPointTwoText',
                                            label: 'Visit point two text',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPointThreeTitle',
                                            label: 'Visit point three title',
                                        },
                                        {
                                            key: 'visitPointThreeText',
                                            label: 'Visit point three text',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPrimaryCta',
                                            label: 'Visit primary CTA',
                                        },
                                        {
                                            key: 'visitSecondaryCta',
                                            label: 'Visit secondary CTA',
                                        },
                                        {
                                            key: 'faqEyebrow',
                                            label: 'FAQ eyebrow',
                                        },
                                        {
                                            key: 'faqTitle',
                                            label: 'FAQ title',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template1', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 1 Campus Stats')}
                                    description={t('Campus metrics shown in the campus section.')}
                                    items={getTemplateArray('template1', 'campusStats')}
                                    fields={[
                                        { key: 'value', label: 'Value' },
                                        { key: 'label', label: 'Label' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'campusStats', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 1 News')}
                                    description="Latest news cards for Template 1."
                                    items={getTemplateArray('template1', 'news')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'detail',
                                            label: 'Detail',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'news', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 1 Outcomes')}
                                    description={t('Outcome cards shown after campus storytelling.')}
                                    items={getTemplateArray('template1', 'outcomes')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'outcomes', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 1 Journey Steps')}
                                    description={t('Admissions journey steps for families.')}
                                    items={getTemplateArray('template1', 'journeySteps')}
                                    fields={[
                                        { key: 'step', label: 'Step number' },
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'journeySteps', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 1 Testimonials')}
                                    description="Parent, student, and faculty voice cards."
                                    items={getTemplateArray('template1', 'testimonials')}
                                    fields={[
                                        {
                                            key: 'quote',
                                            label: 'Quote',
                                            rows: 3,
                                        },
                                        { key: 'name', label: 'Name' },
                                        { key: 'role', label: 'Role' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'testimonials', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 1 FAQs')}
                                    description={t('Frequently asked questions for the classic homepage.')}
                                    items={getTemplateArray('template1', 'faqs')}
                                    fields={[
                                        { key: 'question', label: 'Question' },
                                        {
                                            key: 'answer',
                                            label: 'Answer',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template1', 'faqs', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 1 Admissions')}
                                    description="Classic admissions and enquiry copy for Template 1."
                                    data={content.template1 as Record<string, string>}
                                    fields={templateAdmissionsFields}
                                    onChange={(key, value) => updateTemplateField('template1', key, value)}
                                />
                            </TabsContent>

                            <TabsContent value="template2" className="space-y-6">
                                <FieldGrid
                                    title={t('Template 2 Hero')}
                                    description="Template 2 has its own modern hero content and motion-first messaging."
                                    data={content.template2 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateTwoHeroEyebrow',
                                            label: 'Hero eyebrow',
                                        },
                                        {
                                            key: 'templateTwoHeroTitle',
                                            label: 'Hero title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'templateTwoHeroDescription',
                                            label: 'Hero description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'templateTwoHeroPrimaryCta',
                                            label: 'Primary CTA',
                                        },
                                        {
                                            key: 'templateTwoHeroSecondaryCta',
                                            label: 'Secondary CTA',
                                        },
                                        {
                                            key: 'templateTwoHeroFloatingLabel',
                                            label: 'Floating label',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template2', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 2 Highlights')}
                                    description="Top metric cards shown in the Template 2 hero area."
                                    items={getTemplateArray('template2', 'highlights')}
                                    fields={[
                                        { key: 'value', label: 'Value' },
                                        { key: 'label', label: 'Label' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template2', 'highlights', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 2 Slides')}
                                    description="3D slider cards for the modern homepage."
                                    items={getTemplateArray('template2', 'templateTwoSlides')}
                                    fields={[
                                        { key: 'eyebrow', label: 'Eyebrow' },
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                        { key: 'metric', label: 'Metric' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template2', 'templateTwoSlides', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 2 About')}
                                    description="About copy shown below the 3D hero experience."
                                    data={content.template2 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateTwoAboutEyebrow',
                                            label: 'About eyebrow',
                                        },
                                        {
                                            key: 'templateTwoAboutTitle',
                                            label: 'About title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'templateTwoAboutDescription',
                                            label: 'About description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template2', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 2 About Cards')}
                                    description={t('Small supporting cards in the about section.')}
                                    items={getTemplateArray('template2', 'templateTwoAboutCards')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template2',
                                            'templateTwoAboutCards',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 2 Gallery')}
                                    description={t('Gallery intro copy for the immersive visual section.')}
                                    data={content.template2 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateTwoGalleryEyebrow',
                                            label: 'Gallery eyebrow',
                                        },
                                        {
                                            key: 'templateTwoGalleryTitle',
                                            label: 'Gallery title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'templateTwoGalleryDescription',
                                            label: 'Gallery description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template2', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 2 Gallery Items')}
                                    description={t('Gallery cards used in the modern visual grid.')}
                                    items={getTemplateArray('template2', 'templateTwoGalleryItems')}
                                    fields={[
                                        { key: 'category', label: 'Category' },
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template2',
                                            'templateTwoGalleryItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 2 Admissions')}
                                    description="Separate admissions copy for the Template 2 landing experience."
                                    data={content.template2 as Record<string, string>}
                                    fields={templateAdmissionsFields}
                                    onChange={(key, value) => updateTemplateField('template2', key, value)}
                                />

                                <FieldGrid
                                    title={t('Template 2 Contact')}
                                    description="Template 2 contact section headline and CTA controls."
                                    data={content.template2 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateTwoContactEyebrow',
                                            label: 'Contact eyebrow',
                                        },
                                        {
                                            key: 'templateTwoContactTitle',
                                            label: 'Contact title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'templateTwoContactDescription',
                                            label: 'Contact description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'templateTwoContactPrimaryCta',
                                            label: 'Primary CTA',
                                        },
                                        {
                                            key: 'templateTwoContactSecondaryCta',
                                            label: 'Secondary CTA',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template2', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 2 Contact Items')}
                                    description="Contact cards for email, phone, visit, or enquiry details."
                                    items={getTemplateArray('template2', 'templateTwoContactItems')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'value', label: 'Value' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template2',
                                            'templateTwoContactItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />
                            </TabsContent>

                            <TabsContent value="template3" className="space-y-6">
                                <FieldGrid
                                    title={t('Template 3 Hero')}
                                    description="Template 3 has its own editorial hero and heritage-style messaging."
                                    data={content.template3 as Record<string, string>}
                                    fields={templateHeroFields}
                                    onChange={(key, value) => updateTemplateField('template3', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 3 Highlights')}
                                    description="Hero metrics shown in the Template 3 experience."
                                    items={getTemplateArray('template3', 'highlights')}
                                    fields={[
                                        { key: 'value', label: 'Value' },
                                        { key: 'label', label: 'Label' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'highlights', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 3 Spotlight and About')}
                                    description="Editorial spotlight, open house, and institution story content."
                                    data={content.template3 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'featureEyebrow',
                                            label: 'Spotlight eyebrow',
                                        },
                                        {
                                            key: 'featureTitle',
                                            label: 'Spotlight title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'openHouseLabel',
                                            label: 'Open house label',
                                        },
                                        {
                                            key: 'openHouseDescription',
                                            label: 'Open house description',
                                            rows: 3,
                                        },
                                        {
                                            key: 'openHouseDate',
                                            label: 'Open house date',
                                        },
                                        {
                                            key: 'liveOverviewValue',
                                            label: 'Live overview value',
                                        },
                                        {
                                            key: 'liveOverviewLabel',
                                            label: 'Live overview label',
                                            rows: 2,
                                        },
                                        {
                                            key: 'aboutEyebrow',
                                            label: 'About eyebrow',
                                        },
                                        {
                                            key: 'aboutTitle',
                                            label: 'About title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'aboutDescription',
                                            label: 'About description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template3', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 3 Pillars')}
                                    description="Trust and campus experience cards for Template 3."
                                    items={getTemplateArray('template3', 'pillars')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'text', label: 'Text', rows: 3 },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'pillars', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 3 Programs, Campus, and Outcomes')}
                                    description="The core editorial sections unique to Template 3."
                                    data={content.template3 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'programsEyebrow',
                                            label: 'Programs eyebrow',
                                        },
                                        {
                                            key: 'programsTitle',
                                            label: 'Programs title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'programsDescription',
                                            label: 'Programs description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'campusEyebrow',
                                            label: 'Campus eyebrow',
                                        },
                                        {
                                            key: 'campusTitle',
                                            label: 'Campus title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'campusDescription',
                                            label: 'Campus description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'newsEyebrow',
                                            label: 'News eyebrow',
                                        },
                                        {
                                            key: 'outcomesEyebrow',
                                            label: 'Outcomes eyebrow',
                                        },
                                        {
                                            key: 'outcomesTitle',
                                            label: 'Outcomes title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'outcomesDescription',
                                            label: 'Outcomes description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'journeyEyebrow',
                                            label: 'Journey eyebrow',
                                        },
                                        {
                                            key: 'journeyTitle',
                                            label: 'Journey title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'journeyDescription',
                                            label: 'Journey description',
                                            rows: 4,
                                        },
                                        {
                                            key: 'voicesEyebrow',
                                            label: 'Voices eyebrow',
                                        },
                                        {
                                            key: 'voicesTitle',
                                            label: 'Voices title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitEyebrow',
                                            label: 'Visit eyebrow',
                                        },
                                        {
                                            key: 'visitTitle',
                                            label: 'Visit title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPointOneTitle',
                                            label: 'Visit point one title',
                                        },
                                        {
                                            key: 'visitPointOneText',
                                            label: 'Visit point one text',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPointTwoTitle',
                                            label: 'Visit point two title',
                                        },
                                        {
                                            key: 'visitPointTwoText',
                                            label: 'Visit point two text',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPointThreeTitle',
                                            label: 'Visit point three title',
                                        },
                                        {
                                            key: 'visitPointThreeText',
                                            label: 'Visit point three text',
                                            rows: 3,
                                        },
                                        {
                                            key: 'visitPrimaryCta',
                                            label: 'Visit primary CTA',
                                        },
                                        {
                                            key: 'visitSecondaryCta',
                                            label: 'Visit secondary CTA',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template3', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 3 Programs')}
                                    description={t('Programs list for the heritage editorial homepage.')}
                                    items={getTemplateArray('template3', 'programs')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'age', label: 'Stage / Age' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'programs', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 3 Campus Stats')}
                                    description="Campus metrics for Template 3."
                                    items={getTemplateArray('template3', 'campusStats')}
                                    fields={[
                                        { key: 'value', label: 'Value' },
                                        { key: 'label', label: 'Label' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'campusStats', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 3 News')}
                                    description={t('Latest highlights used in the editorial layout.')}
                                    items={getTemplateArray('template3', 'news')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'detail',
                                            label: 'Detail',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'news', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 3 Outcomes')}
                                    description={t('Outcome cards for the heritage homepage.')}
                                    items={getTemplateArray('template3', 'outcomes')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'outcomes', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 3 Journey Steps')}
                                    description="Admissions journey steps for Template 3."
                                    items={getTemplateArray('template3', 'journeySteps')}
                                    fields={[
                                        { key: 'step', label: 'Step number' },
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'journeySteps', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 3 Testimonials')}
                                    description={t('Voice cards for the heritage editorial template.')}
                                    items={getTemplateArray('template3', 'testimonials')}
                                    fields={[
                                        {
                                            key: 'quote',
                                            label: 'Quote',
                                            rows: 3,
                                        },
                                        { key: 'name', label: 'Name' },
                                        { key: 'role', label: 'Role' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template3', 'testimonials', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 3 Admissions')}
                                    description="Template 3 admissions content is now separate from Template 1."
                                    data={content.template3 as Record<string, string>}
                                    fields={templateAdmissionsFields}
                                    onChange={(key, value) => updateTemplateField('template3', key, value)}
                                />
                            </TabsContent>

                            <TabsContent value="template4" className="space-y-6">
                                <FieldGrid
                                    title={t('Template 4 Top Header')}
                                    description={t('Contact and address details shown in the colorful top header bar.')}
                                    data={content.template4 as Record<string, string>}
                                    fields={templateFourTopFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <FieldGrid
                                    title={t('Template 4 Hero and Notice')}
                                    description={t('Classic hero section and visible principal notice content.')}
                                    data={content.template4 as Record<string, string>}
                                    fields={templateFourHeroFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 4 Highlights')}
                                    description={t('Top classic stat cards shown below the hero.')}
                                    items={getTemplateArray('template4', 'highlights')}
                                    fields={[
                                        { key: 'value', label: 'Value' },
                                        { key: 'label', label: 'Label' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template4', 'highlights', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 4 About')}
                                    description={t('About section headline and intro for the classic school layout.')}
                                    data={content.template4 as Record<string, string>}
                                    fields={templateFourAboutFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 4 About Cards')}
                                    description={t('Small classic cards that explain the school identity.')}
                                    items={getTemplateArray('template4', 'templateFourAboutCards')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template4',
                                            'templateFourAboutCards',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 4 Gallery')}
                                    description={t('Gallery section heading and intro copy.')}
                                    data={content.template4 as Record<string, string>}
                                    fields={templateFourGalleryFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 4 Gallery Items')}
                                    description="Gallery cards for campus, classrooms, celebrations, and sports."
                                    items={getTemplateArray('template4', 'templateFourGalleryItems')}
                                    fields={[
                                        { key: 'category', label: 'Category' },
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template4',
                                            'templateFourGalleryItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 4 Events')}
                                    description={t('Events board heading and section intro.')}
                                    data={content.template4 as Record<string, string>}
                                    fields={templateFourEventsFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 4 Events List')}
                                    description={t('Classic events and updates for parents and students.')}
                                    items={getTemplateArray('template4', 'templateFourEvents')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'detail',
                                            label: 'Detail',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template4', 'templateFourEvents', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 4 Admissions')}
                                    description="Admissions CTA copy and link labels for Template 4."
                                    data={content.template4 as Record<string, string>}
                                    fields={templateAdmissionsFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <FieldGrid
                                    title={t('Template 4 Contact')}
                                    description={t('Contact section heading and descriptive copy.')}
                                    data={content.template4 as Record<string, string>}
                                    fields={templateFourContactFields}
                                    onChange={(key, value) => updateTemplateField('template4', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 4 Contact Items')}
                                    description="School office, admissions desk, and campus address cards."
                                    items={getTemplateArray('template4', 'templateFourContactItems')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'value', label: 'Value' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template4',
                                            'templateFourContactItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />
                            </TabsContent>

                            <TabsContent value="template5" className="space-y-6">
                                <FieldGrid
                                    title={t('Template 5 Top Bar')}
                                    description={t('Contact details shown in the navy top utility bar.')}
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveTopPhone',
                                            label: 'Phone number',
                                        },
                                        {
                                            key: 'templateFiveTopEmail',
                                            label: 'Email address',
                                        },
                                        {
                                            key: 'templateFiveTopAddress',
                                            label: 'Address',
                                            rows: 2,
                                        },
                                        {
                                            key: 'templateFiveSocialFacebook',
                                            label: 'Facebook URL',
                                        },
                                        {
                                            key: 'templateFiveSocialTwitter',
                                            label: 'Twitter URL',
                                        },
                                        {
                                            key: 'templateFiveSocialYoutube',
                                            label: 'YouTube URL',
                                        },
                                        {
                                            key: 'templateFiveSocialInstagram',
                                            label: 'Instagram URL',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <FieldGrid
                                    title={t('Template 5 Hero')}
                                    description="Main hero section content with title, subtitle, and description."
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveHeroTitle',
                                            label: 'Hero title',
                                            rows: 3,
                                        },
                                        {
                                            key: 'templateFiveHeroSubtitle',
                                            label: 'Hero subtitle',
                                            rows: 2,
                                        },
                                        {
                                            key: 'templateFiveHeroDescription',
                                            label: 'Hero description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 5 News Marquee')}
                                    description={t('Scrolling news ticker items shown below the navigation.')}
                                    items={getTemplateArray('template5', 'templateFiveMarqueeItems')}
                                    fields={[
                                        { key: 'text', label: 'News text' },
                                        { key: 'url', label: 'Link URL' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveMarqueeItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 5 Principal Message')}
                                    description="Principal's greeting and message shown in the homepage."
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFivePrincipalName',
                                            label: 'Principal name',
                                        },
                                        {
                                            key: 'templateFivePrincipalDesignation',
                                            label: 'Designation',
                                        },
                                        {
                                            key: 'templateFivePrincipalMessage',
                                            label: 'Message',
                                            rows: 5,
                                        },
                                        {
                                            key: 'templateFivePrincipalImage',
                                            label: 'Image URL',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <FieldGrid
                                    title={t('Template 5 Secretary Message')}
                                    description="Secretary's greeting and message shown in the homepage."
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveSecretaryName',
                                            label: 'Secretary name',
                                        },
                                        {
                                            key: 'templateFiveSecretaryDesignation',
                                            label: 'Designation',
                                        },
                                        {
                                            key: 'templateFiveSecretaryMessage',
                                            label: 'Message',
                                            rows: 5,
                                        },
                                        {
                                            key: 'templateFiveSecretaryImage',
                                            label: 'Image URL',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <FieldGrid
                                    title={t('Template 5 About')}
                                    description={t('About section content for the institutional homepage.')}
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveAboutTitle',
                                            label: 'About title',
                                            rows: 2,
                                        },
                                        {
                                            key: 'templateFiveAboutDescription',
                                            label: 'About description',
                                            rows: 5,
                                        },
                                        {
                                            key: 'templateFiveAboutImage',
                                            label: 'About image URL',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 5 Achievements')}
                                    description={t('Counter bar statistics shown below the hero.')}
                                    items={getTemplateArray('template5', 'templateFiveAchievements')}
                                    fields={[
                                        {
                                            key: 'value',
                                            label: 'Value (e.g. 3200+)',
                                        },
                                        {
                                            key: 'label',
                                            label: 'Label (e.g. Students Enrolled)',
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveAchievements',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 5 Departments')}
                                    description={t('Academic department cards shown on the homepage.')}
                                    items={getTemplateArray('template5', 'templateFiveDepartments')}
                                    fields={[
                                        {
                                            key: 'title',
                                            label: 'Department name',
                                        },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 4,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveDepartments',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 5 Why Choose Us')}
                                    description={t('Feature cards highlighting institutional strengths.')}
                                    items={getTemplateArray('template5', 'templateFiveWhyChooseUs')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveWhyChooseUs',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 5 Events')}
                                    description={t('Upcoming events listed on the homepage.')}
                                    items={getTemplateArray('template5', 'templateFiveEvents')}
                                    fields={[
                                        { key: 'title', label: 'Event title' },
                                        {
                                            key: 'detail',
                                            label: 'Detail',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template5', 'templateFiveEvents', index, field, value)
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 5 News')}
                                    description={t('Latest news items shown on the homepage.')}
                                    items={getTemplateArray('template5', 'templateFiveNews')}
                                    fields={[
                                        { key: 'title', label: 'News title' },
                                        {
                                            key: 'detail',
                                            label: 'Detail',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem('template5', 'templateFiveNews', index, field, value)
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 5 Gallery')}
                                    description={t('Gallery section heading and intro copy.')}
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveGalleryTitle',
                                            label: 'Gallery title',
                                            rows: 2,
                                        },
                                        {
                                            key: 'templateFiveGalleryDescription',
                                            label: 'Gallery description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 5 Gallery Items')}
                                    description="Gallery cards for campus, classrooms, labs, and events."
                                    items={getTemplateArray('template5', 'templateFiveGalleryItems')}
                                    fields={[
                                        { key: 'category', label: 'Category' },
                                        { key: 'title', label: 'Title' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveGalleryItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <ArrayEditor
                                    title={t('Template 5 Testimonials')}
                                    description={t('Student and alumni testimonial cards.')}
                                    items={getTemplateArray('template5', 'templateFiveTestimonials')}
                                    fields={[
                                        {
                                            key: 'quote',
                                            label: 'Quote',
                                            rows: 3,
                                        },
                                        { key: 'name', label: 'Name' },
                                        { key: 'role', label: 'Role' },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveTestimonials',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 5 Contact')}
                                    description={t('Contact section heading and Google Maps embed.')}
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveContactTitle',
                                            label: 'Contact title',
                                            rows: 2,
                                        },
                                        {
                                            key: 'templateFiveContactDescription',
                                            label: 'Contact description',
                                            rows: 3,
                                        },
                                        {
                                            key: 'templateFiveMapEmbedUrl',
                                            label: 'Google Maps embed URL',
                                            rows: 2,
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />

                                <ArrayEditor
                                    title={t('Template 5 Contact Items')}
                                    description="Phone, email, and address contact cards."
                                    items={getTemplateArray('template5', 'templateFiveContactItems')}
                                    fields={[
                                        { key: 'title', label: 'Title' },
                                        { key: 'value', label: 'Value' },
                                        {
                                            key: 'description',
                                            label: 'Description',
                                            rows: 3,
                                        },
                                    ]}
                                    onChange={(index, field, value) =>
                                        updateTemplateArrayItem(
                                            'template5',
                                            'templateFiveContactItems',
                                            index,
                                            field,
                                            value,
                                        )
                                    }
                                />

                                <FieldGrid
                                    title={t('Template 5 Footer')}
                                    description={t('Footer copyright text and tagline.')}
                                    data={content.template5 as Record<string, string>}
                                    fields={[
                                        {
                                            key: 'templateFiveFooterCopyright',
                                            label: 'Copyright text',
                                        },
                                        {
                                            key: 'templateFiveFooterTagline',
                                            label: 'Tagline',
                                        },
                                    ]}
                                    onChange={(key, value) => updateTemplateField('template5', key, value)}
                                />
                            </TabsContent>

                            <TabsContent value="preview" className="space-y-6">
                                <WebsiteThemeSelector
                                    activeTemplate={content.activeTemplate}
                                    activeTheme={content.theme}
                                    content={templateOnePreview}
                                    onSelect={(template, theme) => {
                                        setContent((current) => ({
                                            ...current,
                                            activeTemplate: template,
                                            theme: theme,
                                        }));
                                        toast.success(
                                            `Switched to ${templateOptions.find((t) => t.key === template)?.label} with ${websiteThemes[theme].name} theme`,
                                        );
                                    }}
                                />
                            </TabsContent>
                        </Tabs>
                    </RegionalLanguageContext.Provider>
                </div>
            </form>
        </DashboardLayout>
    );
}
