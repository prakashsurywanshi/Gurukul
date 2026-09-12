import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import ImageLightbox from '../../components/website/ImageLightbox';
import {
    ArrowRight,
    BookOpen,
    ChevronDown,
    FlaskConical,
    GraduationCap,
    Heart,
    Mail,
    MapPin,
    Phone,
    Shield,
    Star,
    Trophy,
    Users,
    Pencil,
    Trash2,
    ArrowUp,
    ArrowDown,
    Plus,
    X,
    Check,
    Megaphone,
    Type,
    LayoutGrid,
    HelpCircle,
} from 'lucide-react';

export interface PageSection {
    id: string;
    type: 'hero' | 'text' | 'image-gallery' | 'features' | 'contact' | 'cta' | 'faq';
    data: Record<string, any>;
}

interface TemplateFiveSectionsProps {
    sections: PageSection[];
    isEditing?: boolean;
    onSectionUpdate?: (index: number, data: Record<string, any>) => void;
    onSectionRemove?: (index: number) => void;
    onSectionMove?: (index: number, direction: 'up' | 'down') => void;
    onSectionAdd?: (type: PageSection['type'], data: Record<string, any>) => void;
    isSaving?: boolean;
}

const featureIcons = [GraduationCap, FlaskConical, BookOpen, Trophy, Star, Heart, Shield, Users];

const contactIconMap: Record<string, typeof Phone> = {
    phone: Phone,
    mail: Mail,
    email: Mail,
    map: MapPin,
    location: MapPin,
    pin: MapPin,
    clock: Users,
    time: Users,
    default: Phone,
};

const sectionTypeLabels: Record<string, string> = {
    hero: 'Hero Banner',
    text: 'Rich Text',
    'image-gallery': 'Image Gallery',
    features: 'Features',
    contact: 'Contact',
    cta: 'Call to Action',
    faq: 'FAQ',
};

const allSectionTypes: PageSection['type'][] = ['hero', 'text', 'image-gallery', 'features', 'contact', 'cta', 'faq'];

function getDefaultSectionData(type: string): Record<string, any> {
    switch (type) {
        case 'hero':
            return {
                title: 'Page Title',
                subtitle: '',
                description: '',
                primaryCta: '',
                primaryCtaUrl: '',
                secondaryCta: '',
                secondaryCtaUrl: '',
            };
        case 'text':
            return { title: '', content: '<p>Write your content here...</p>' };
        case 'image-gallery':
            return {
                title: 'Gallery',
                description: '',
                items: [{ title: '', description: '', image: '', category: '' }],
            };
        case 'features':
            return {
                title: 'Features',
                description: '',
                items: [{ title: 'Feature 1', description: '' }],
            };
        case 'contact':
            return {
                title: 'Contact Us',
                description: '',
                items: [{ title: 'Phone', value: '', description: '' }],
            };
        case 'cta':
            return {
                title: 'Get Started',
                description: '',
                primaryCta: 'Contact Us',
                primaryCtaUrl: '#',
                secondaryCta: '',
                secondaryCtaUrl: '',
            };
        case 'faq':
            return {
                title: 'FAQ',
                description: '',
                items: [{ question: 'Question?', answer: 'Answer here.' }],
            };
        default:
            return {};
    }
}

const inputClass = 'w-full rounded border border-slate-300 px-3 py-2 text-sm';
const textareaClass = 'w-full rounded border border-slate-300 px-3 py-2 text-sm resize-y';

function SectionEditForm({
    section,
    onSave,
    onCancel,
    isSaving,
}: {
    section: PageSection;
    onSave: (data: Record<string, any>) => void;
    onCancel: () => void;
    isSaving?: boolean;
}) {
    const [draft, setDraft] = useState<Record<string, any>>(() => JSON.parse(JSON.stringify(section.data)));

    const updateField = (key: string, value: any) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const updateArrayItem = (key: string, index: number, field: string, value: string) => {
        setDraft((prev) => {
            const arr = [...(prev[key] || [])];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, [key]: arr };
        });
    };

    const addArrayItem = (key: string, emptyItem: Record<string, string>) => {
        setDraft((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), { ...emptyItem }],
        }));
    };

    const removeArrayItem = (key: string, index: number) => {
        setDraft((prev) => {
            const arr = [...(prev[key] || [])];
            arr.splice(index, 1);
            return { ...prev, [key]: arr };
        });
    };

    const renderFields = () => {
        const { t } = useLanguage();
        switch (section.type) {
            case 'hero':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <Field
                            label={t('Subtitle')}
                            value={draft.subtitle || ''}
                            onChange={(v) => updateField('subtitle', v)}
                        />
                        <Field
                            label={t('Description')}
                            value={draft.description || ''}
                            onChange={(v) => updateField('description', v)}
                        />
                        <Field
                            label={t('Primary CTA')}
                            value={draft.primaryCta || ''}
                            onChange={(v) => updateField('primaryCta', v)}
                        />
                        <Field
                            label={t('Primary CTA URL')}
                            value={draft.primaryCtaUrl || ''}
                            onChange={(v) => updateField('primaryCtaUrl', v)}
                        />
                        <Field
                            label={t('Secondary CTA')}
                            value={draft.secondaryCta || ''}
                            onChange={(v) => updateField('secondaryCta', v)}
                        />
                        <Field
                            label={t('Secondary CTA URL')}
                            value={draft.secondaryCtaUrl || ''}
                            onChange={(v) => updateField('secondaryCtaUrl', v)}
                        />
                    </>
                );

            case 'text':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <TextareaField
                            label={t('Content (HTML)')}
                            value={draft.content || ''}
                            onChange={(v) => updateField('content', v)}
                            rows={6}
                        />
                    </>
                );

            case 'image-gallery':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <Field
                            label={t('Description')}
                            value={draft.description || ''}
                            onChange={(v) => updateField('description', v)}
                        />
                        <ArraySection
                            items={draft.items || []}
                            onAdd={() =>
                                addArrayItem('items', {
                                    title: '',
                                    description: '',
                                    image: '',
                                    category: '',
                                })
                            }
                            onRemove={(i) => removeArrayItem('items', i)}
                            onUpdate={(i, field, val) => updateArrayItem('items', i, field, val)}
                            fields={[
                                { key: 'category', label: 'Event Name' },
                                { key: 'title', label: 'Title' },
                                { key: 'description', label: 'Description' },
                                { key: 'image', label: 'Image URL' },
                            ]}
                        />
                    </>
                );

            case 'features':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <Field
                            label={t('Description')}
                            value={draft.description || ''}
                            onChange={(v) => updateField('description', v)}
                        />
                        <ArraySection
                            items={draft.items || []}
                            onAdd={() =>
                                addArrayItem('items', {
                                    title: '',
                                    description: '',
                                })
                            }
                            onRemove={(i) => removeArrayItem('items', i)}
                            onUpdate={(i, field, val) => updateArrayItem('items', i, field, val)}
                            fields={[
                                { key: 'title', label: 'Title' },
                                { key: 'description', label: 'Description' },
                            ]}
                        />
                    </>
                );

            case 'contact':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <Field
                            label={t('Description')}
                            value={draft.description || ''}
                            onChange={(v) => updateField('description', v)}
                        />
                        <ArraySection
                            items={draft.items || []}
                            onAdd={() =>
                                addArrayItem('items', {
                                    title: '',
                                    value: '',
                                    description: '',
                                })
                            }
                            onRemove={(i) => removeArrayItem('items', i)}
                            onUpdate={(i, field, val) => updateArrayItem('items', i, field, val)}
                            fields={[
                                { key: 'title', label: 'Title' },
                                { key: 'value', label: 'Value' },
                                { key: 'description', label: 'Description' },
                            ]}
                        />
                    </>
                );

            case 'cta':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <Field
                            label={t('Description')}
                            value={draft.description || ''}
                            onChange={(v) => updateField('description', v)}
                        />
                        <Field
                            label={t('Primary CTA')}
                            value={draft.primaryCta || ''}
                            onChange={(v) => updateField('primaryCta', v)}
                        />
                        <Field
                            label={t('Primary CTA URL')}
                            value={draft.primaryCtaUrl || ''}
                            onChange={(v) => updateField('primaryCtaUrl', v)}
                        />
                        <Field
                            label={t('Secondary CTA')}
                            value={draft.secondaryCta || ''}
                            onChange={(v) => updateField('secondaryCta', v)}
                        />
                        <Field
                            label={t('Secondary CTA URL')}
                            value={draft.secondaryCtaUrl || ''}
                            onChange={(v) => updateField('secondaryCtaUrl', v)}
                        />
                    </>
                );

            case 'faq':
                return (
                    <>
                        <Field label={t('Title')} value={draft.title || ''} onChange={(v) => updateField('title', v)} />
                        <Field
                            label={t('Description')}
                            value={draft.description || ''}
                            onChange={(v) => updateField('description', v)}
                        />
                        <ArraySection
                            items={draft.items || []}
                            onAdd={() =>
                                addArrayItem('items', {
                                    question: '',
                                    answer: '',
                                })
                            }
                            onRemove={(i) => removeArrayItem('items', i)}
                            onUpdate={(i, field, val) => updateArrayItem('items', i, field, val)}
                            fields={[
                                { key: 'question', label: 'Question' },
                                {
                                    key: 'answer',
                                    label: 'Answer',
                                    type: 'textarea',
                                },
                            ]}
                        />
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">
                Edit {sectionTypeLabels[section.type] || section.type}
            </h4>
            {renderFields()}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => onSave(draft)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                    <Check className="h-3.5 w-3.5" />
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                </button>
            </div>
        </div>
    );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        </div>
    );
}

function TextareaField({
    label,
    value,
    onChange,
    rows = 4,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
}) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
            <textarea value={value} onChange={(e) => onChange(e.target.value)} className={textareaClass} rows={rows} />
        </div>
    );
}

function ArraySection({
    items,
    onAdd,
    onRemove,
    onUpdate,
    fields,
}: {
    items: Record<string, any>[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: string, value: string) => void;
    fields: Array<{ key: string; label: string; type?: 'text' | 'textarea' }>;
}) {
    return (
        <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-500">Items ({items.length})</label>
            {items.map((item, i) => (
                <div key={i} className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">Item {i + 1}</span>
                        <button
                            type="button"
                            onClick={() => onRemove(i)}
                            className="text-red-400 hover:text-red-600 transition"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {fields.map((f) =>
                        f.type === 'textarea' ? (
                            <TextareaField
                                key={f.key}
                                label={f.label}
                                value={item[f.key] || ''}
                                onChange={(v) => onUpdate(i, f.key, v)}
                                rows={3}
                            />
                        ) : (
                            <Field
                                key={f.key}
                                label={f.label}
                                value={item[f.key] || ''}
                                onChange={(v) => onUpdate(i, f.key, v)}
                            />
                        ),
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 transition hover:border-blue-400 hover:text-blue-600"
            >
                <Plus className="h-3 w-3" />
                Add Item
            </button>
        </div>
    );
}

function SectionToolbar({
    sectionType,
    index,
    total,
    isEditing,
    onEditClick,
    onMoveUp,
    onMoveDown,
    onRemove,
}: {
    sectionType: string;
    index: number;
    total: number;
    isEditing: boolean;
    onEditClick: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
}) {
    const { t } = useLanguage();
    if (!isEditing) return null;

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-t-lg px-3 py-1.5 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded">
                {sectionTypeLabels[sectionType] || sectionType}
            </span>
            <div className="flex-1" />
            <button
                type="button"
                onClick={onEditClick}
                className="rounded p-1 text-blue-600 transition hover:bg-blue-100"
                title={t('Edit section')}
            >
                <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                className="rounded p-1 text-slate-500 transition hover:bg-blue-100 disabled:opacity-30"
                title={t('Move up')}
            >
                <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={onMoveDown}
                disabled={index === total - 1}
                className="rounded p-1 text-slate-500 transition hover:bg-blue-100 disabled:opacity-30"
                title={t('Move down')}
            >
                <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={onRemove}
                className="rounded p-1 text-red-500 transition hover:bg-red-50"
                title={t('Remove section')}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function AddSectionPalette({ onAdd }: { onAdd: (type: PageSection['type'], data: Record<string, any>) => void }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);

    return (
        <div className="my-6 mx-auto max-w-7xl px-5 sm:px-8">
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:text-blue-600"
                >
                    <Plus className="h-4 w-4" />
                    Add Section
                </button>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">{t('Add a Section')}</h4>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded p-1 text-slate-400 hover:text-slate-600 transition"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {allSectionTypes.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    onAdd(type, getDefaultSectionData(type));
                                    setOpen(false);
                                }}
                                className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center transition hover:border-blue-300 hover:bg-blue-50"
                            >
                                <SectionTypeIcon type={type} />
                                <span className="text-xs font-medium text-slate-600">{sectionTypeLabels[type]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'hero':
            return <Megaphone className="h-5 w-5 text-blue-500" />;
        case 'text':
            return <Type className="h-5 w-5 text-blue-500" />;
        case 'image-gallery':
            return <LayoutGrid className="h-5 w-5 text-blue-500" />;
        case 'features':
            return <Star className="h-5 w-5 text-blue-500" />;
        case 'contact':
            return <Phone className="h-5 w-5 text-blue-500" />;
        case 'cta':
            return <Megaphone className="h-5 w-5 text-blue-500" />;
        case 'faq':
            return <HelpCircle className="h-5 w-5 text-blue-500" />;
        default:
            return <Plus className="h-5 w-5 text-blue-500" />;
    }
}

// --- Display Components (unchanged) ---

function HeroSection({ data }: { data: Record<string, any> }) {
    const bgImage = data.backgroundImage || data.background_image || data.image || null;

    return (
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#002147_0%,#001530_50%,#000d1f_100%)]">
            {bgImage && (
                <img
                    src={bgImage}
                    alt={data.title || ''}
                    className="absolute inset-0 h-full w-full object-cover opacity-20"
                />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,33,71,0.92),rgba(0,21,48,0.85))]" />
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#2563EB]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#2563EB]/5 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
                <div className="max-w-3xl">
                    {data.title && (
                        <h1 className="font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                            {data.title}
                        </h1>
                    )}
                    {data.subtitle && (
                        <p className="mt-4 text-lg font-semibold text-[#2563EB] sm:text-xl">{data.subtitle}</p>
                    )}
                    {data.description && (
                        <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">{data.description}</p>
                    )}

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                        {(data.primaryButtonLabel || data.primaryCta) && (
                            <a
                                href={data.primaryButtonUrl || data.primaryCtaUrl || '#'}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-[#1d4ed8]"
                            >
                                {data.primaryButtonLabel || data.primaryCta}
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        )}
                        {(data.secondaryButtonLabel || data.secondaryCta) && (
                            <a
                                href={data.secondaryButtonUrl || data.secondaryCtaUrl || '#'}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:border-[#2563EB] hover:text-[#2563EB]"
                            >
                                {data.secondaryButtonLabel || data.secondaryCta}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function TextSection({ data }: { data: Record<string, any> }) {
    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                {data.title && (
                    <h2 className="font-serif text-3xl font-bold text-[#002147] sm:text-4xl">{data.title}</h2>
                )}
                {data.content && (
                    <div
                        className={
                            data.title
                                ? 'mt-8 text-sm leading-7 text-stone-600 sm:text-base prose prose-stone max-w-none'
                                : 'text-sm leading-7 text-stone-600 sm:text-base'
                        }
                        dangerouslySetInnerHTML={{ __html: data.content }}
                    />
                )}
            </div>
        </section>
    );
}

function ImageGallerySection({ data }: { data: Record<string, any> }) {
    const rawImages = data.images || data.items || [];
    const images: Array<{
        url: string;
        title?: string;
        caption?: string;
        category?: string;
    }> = rawImages.map((img: any) => ({
        url: img.url || img.image || '',
        title: img.title || '',
        caption: img.caption || img.description || '',
        category: img.category || '',
    }));

    const albumMap = new Map<string, typeof images>();
    images.forEach((img) => {
        const cat = img.category || '';
        if (!albumMap.has(cat)) albumMap.set(cat, []);
        albumMap.get(cat)!.push(img);
    });

    const albumNames = [...albumMap.keys()];
    const [lightboxAlbum, setLightboxAlbum] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const openAlbum = (albumName: string, imageIndex: number = 0) => {
        setLightboxAlbum(albumName);
        setLightboxIndex(imageIndex);
    };

    return (
        <section className="bg-[#F0F4F8]">
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                {(data.title || data.description) && (
                    <div className="text-center">
                        {data.title && (
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">{data.title}</p>
                        )}
                        {data.description && (
                            <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                {data.description}
                            </h2>
                        )}
                    </div>
                )}

                {albumNames.length > 0 && (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {albumNames.map((albumName) => {
                            const albumImages = albumMap.get(albumName) || [];
                            const coverImage = albumImages.find((img) => img.url) || albumImages[0];
                            const imageCount = albumImages.filter((img) => img.url).length;

                            return (
                                <article
                                    key={albumName || '__unassigned'}
                                    className="group/album cursor-pointer overflow-hidden rounded-xl border border-stone-200 bg-white shadow-md transition hover:shadow-xl"
                                    onClick={() => openAlbum(albumName)}
                                >
                                    <div className="relative h-56 w-full overflow-hidden">
                                        {coverImage?.url ? (
                                            <img
                                                src={coverImage.url}
                                                alt={albumName}
                                                className="h-full w-full object-cover transition duration-500 group-hover/album:scale-110"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#002147,#003366)]">
                                                <ImageIcon className="h-12 w-12 text-[#2563EB]/30" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                        {imageCount > 0 && (
                                            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-white">
                                                <ImageIcon className="h-3 w-3" />
                                                {imageCount} image
                                                {imageCount !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-5">
                                            <h3 className="font-serif text-xl font-bold text-white drop-shadow-lg">
                                                {albumName || 'Album'}
                                            </h3>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {lightboxAlbum !== null && (
                <ImageLightbox
                    images={(albumMap.get(lightboxAlbum) || [])
                        .filter((img) => img.url)
                        .map((img) => ({
                            url: img.url,
                            title: img.title,
                            caption: img.caption,
                        }))}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxAlbum(null)}
                    albumTitle={lightboxAlbum || undefined}
                />
            )}
        </section>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    );
}

function FeaturesSection({ data }: { data: Record<string, any> }) {
    const cards: Array<{ title: string; description: string; icon?: string }> = data.cards || data.items || [];

    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                <div className="text-center">
                    {data.title && (
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">{data.title}</p>
                    )}
                    {data.description && (
                        <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                            {data.description}
                        </h2>
                    )}
                </div>

                {cards.length > 0 && (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {cards.map((card, index) => {
                            const Icon = featureIcons[index % featureIcons.length];
                            return (
                                <div
                                    key={index}
                                    className="rounded-xl border border-stone-200 bg-[#F0F4F8] p-6 text-center shadow-md transition hover:shadow-lg"
                                >
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#002147] text-[#2563EB]">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 font-serif text-lg font-bold text-[#002147]">{card.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

function ContactSection({ data }: { data: Record<string, any> }) {
    const cards: Array<{
        icon?: string;
        title: string;
        value: string;
        description?: string;
    }> = data.cards || data.items || [];

    return (
        <section className="bg-[#F0F4F8]">
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                {(data.title || data.description) && (
                    <div className="text-center">
                        {data.title && (
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">{data.title}</p>
                        )}
                        {data.description && (
                            <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                                {data.description}
                            </h2>
                        )}
                    </div>
                )}

                {cards.length > 0 && (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {cards.map((card, index) => {
                            const iconKey = (card.icon || 'default').toLowerCase();
                            const Icon = contactIconMap[iconKey] || contactIconMap.default;
                            return (
                                <div
                                    key={index}
                                    className="rounded-xl border border-stone-200 bg-white p-6 shadow-md transition hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#002147] text-[#2563EB]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-serif text-base font-bold text-[#002147]">
                                                {card.title}
                                            </h3>
                                            <p className="mt-1 text-sm font-semibold text-stone-800">{card.value}</p>
                                            {card.description && (
                                                <p className="mt-1 text-xs leading-5 text-stone-500">
                                                    {card.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

function CtaSection({ data }: { data: Record<string, any> }) {
    return (
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#002147_0%,#001530_50%,#000d1f_100%)]">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#2563EB]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#2563EB]/5 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                <div className="mx-auto max-w-3xl text-center">
                    {data.title && (
                        <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">{data.title}</h2>
                    )}
                    {data.description && (
                        <p className="mt-4 text-base leading-7 text-white/70 sm:text-lg">{data.description}</p>
                    )}

                    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        {(data.primaryButtonLabel || data.primaryCta) && (
                            <a
                                href={data.primaryButtonUrl || data.primaryCtaUrl || '#'}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-[#1d4ed8]"
                            >
                                {data.primaryButtonLabel || data.primaryCta}
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        )}
                        {(data.secondaryButtonLabel || data.secondaryCta) && (
                            <a
                                href={data.secondaryButtonUrl || data.secondaryCtaUrl || '#'}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#2563EB]/50 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-[#2563EB] transition hover:border-[#2563EB] hover:bg-[#2563EB]/10"
                            >
                                {data.secondaryButtonLabel || data.secondaryCta}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function FaqSection({ data }: { data: Record<string, any> }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const items: Array<{ question: string; answer: string }> = data.items || data.questions || [];

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                <div className="text-center">
                    {data.title && (
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2563EB]">{data.title}</p>
                    )}
                    {data.description && (
                        <h2 className="mt-3 font-serif text-3xl font-bold text-[#002147] sm:text-4xl">
                            {data.description}
                        </h2>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="mx-auto mt-10 max-w-3xl space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={index}
                                className="overflow-hidden rounded-xl border border-stone-200 shadow-md transition hover:shadow-lg"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggle(index)}
                                    className="flex w-full items-center justify-between gap-4 bg-[#F0F4F8] px-6 py-4 text-left transition hover:bg-stone-100"
                                >
                                    <span className="font-serif text-base font-bold text-[#002147]">
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`h-5 w-5 shrink-0 text-[#2563EB] transition-transform ${
                                            openIndex === index ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {openIndex === index && (
                                    <div className="border-t border-stone-200 bg-white px-6 py-5">
                                        <p className="text-sm leading-7 text-stone-600">{item.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

// --- Section Renderers Map ---

const sectionRenderers: Record<PageSection['type'], React.ComponentType<{ data: Record<string, any> }>> = {
    hero: HeroSection,
    text: TextSection,
    'image-gallery': ImageGallerySection,
    features: FeaturesSection,
    contact: ContactSection,
    cta: CtaSection,
    faq: FaqSection,
};

// --- Main Export ---

export default function TemplateFiveSections({
    sections,
    isEditing = false,
    onSectionUpdate,
    onSectionRemove,
    onSectionMove,
    onSectionAdd,
    isSaving = false,
}: TemplateFiveSectionsProps) {
    const { t } = useLanguage();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    return (
        <>
            {sections.map((section, index) => {
                const Renderer = sectionRenderers[section.type];
                if (!Renderer) return null;

                return (
                    <div key={section.id} id={section.id}>
                        {isEditing && (
                            <SectionToolbar
                                sectionType={section.type}
                                index={index}
                                total={sections.length}
                                isEditing={isEditing}
                                onEditClick={() => setEditingIndex(editingIndex === index ? null : index)}
                                onMoveUp={() => onSectionMove?.(index, 'up')}
                                onMoveDown={() => onSectionMove?.(index, 'down')}
                                onRemove={() => onSectionRemove?.(index)}
                            />
                        )}
                        <div className={`relative ${isEditing ? 'rounded-b-lg' : ''}`}>
                            {isEditing && editingIndex === index && (
                                <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm overflow-auto">
                                    <SectionEditForm
                                        section={section}
                                        onSave={(data) => {
                                            onSectionUpdate?.(index, data);
                                            setEditingIndex(null);
                                        }}
                                        onCancel={() => setEditingIndex(null)}
                                        isSaving={isSaving}
                                    />
                                </div>
                            )}
                            <Renderer data={section.data} />
                        </div>
                    </div>
                );
            })}

            {isEditing && onSectionAdd && <AddSectionPalette onAdd={onSectionAdd} />}
        </>
    );
}
