import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    FileText,
    ExternalLink,
    Plus,
    Pencil,
    Trash2,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    Eye,
    Save,
    Type,
    LayoutGrid,
    MessageSquare,
    Phone,
    Megaphone,
    HelpCircle,
    Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import ImageUpload from '../../components/website/ImageUpload';

interface PageSection {
    id: string;
    type: 'hero' | 'text' | 'image-gallery' | 'features' | 'contact' | 'cta' | 'faq';
    data: Record<string, any>;
}

interface PageTemplate {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    slug: string;
    sections: PageSection[];
}

const PAGE_TEMPLATES: PageTemplate[] = [
    {
        id: 'blank',
        label: 'Blank Page',
        description: 'Start with an empty page',
        icon: FileText,
        slug: '',
        sections: [],
    },
    {
        id: 'about',
        label: 'About Us',
        description: 'Institution overview with leadership messages and features',
        icon: MessageSquare,
        slug: 'about-us',
        sections: [
            {
                id: 'tpl_hero',
                type: 'hero',
                data: {
                    title: 'About Us',
                    subtitle: 'Learn about our institution',
                    description: '',
                    primaryCta: '',
                    primaryCtaUrl: '',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
            {
                id: 'tpl_text',
                type: 'text',
                data: {
                    title: 'Our Story',
                    content: '<p>Write about your institution here...</p>',
                },
            },
            {
                id: 'tpl_features',
                type: 'features',
                data: {
                    title: 'Why Choose Us',
                    description: '',
                    items: [
                        {
                            icon: 'star',
                            title: 'Feature 1',
                            description: 'Description here',
                        },
                        {
                            icon: 'star',
                            title: 'Feature 2',
                            description: 'Description here',
                        },
                    ],
                },
            },
        ],
    },
    {
        id: 'admissions',
        label: 'Admissions',
        description: 'Admission process, benefits, and application CTA',
        icon: Megaphone,
        slug: 'admissions',
        sections: [
            {
                id: 'tpl_hero',
                type: 'hero',
                data: {
                    title: 'Admissions',
                    subtitle: 'Begin your journey with us',
                    description: 'Our admission process is simple and transparent.',
                    primaryCta: 'Apply Now',
                    primaryCtaUrl: '/admissions/apply',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
            {
                id: 'tpl_features',
                type: 'features',
                data: {
                    title: 'Why Apply',
                    description: '',
                    items: [
                        {
                            icon: 'star',
                            title: 'Merit-based selection',
                            description: 'Transparent and fair admission process',
                        },
                        {
                            icon: 'star',
                            title: 'Scholarship support',
                            description: 'Financial assistance available for eligible students',
                        },
                    ],
                },
            },
            {
                id: 'tpl_cta',
                type: 'cta',
                data: {
                    title: 'Ready to Apply?',
                    description: 'Start your application today.',
                    primaryCta: 'Apply Now',
                    primaryCtaUrl: '/admissions/apply',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
        ],
    },
    {
        id: 'departments',
        label: 'Departments',
        description: 'Showcase academic departments with feature cards',
        icon: LayoutGrid,
        slug: 'departments',
        sections: [
            {
                id: 'tpl_hero',
                type: 'hero',
                data: {
                    title: 'Our Departments',
                    subtitle: 'Academic excellence across disciplines',
                    description: '',
                    primaryCta: '',
                    primaryCtaUrl: '',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
            {
                id: 'tpl_features',
                type: 'features',
                data: {
                    title: 'Departments',
                    description: '',
                    items: [
                        {
                            icon: 'star',
                            title: 'Arts',
                            description: 'Department description here',
                        },
                        {
                            icon: 'star',
                            title: 'Commerce',
                            description: 'Department description here',
                        },
                        {
                            icon: 'star',
                            title: 'Science',
                            description: 'Department description here',
                        },
                    ],
                },
            },
        ],
    },
    {
        id: 'gallery',
        label: 'Gallery',
        description: 'Photo gallery with image grid',
        icon: ImageIcon,
        slug: 'gallery',
        sections: [
            {
                id: 'tpl_hero',
                type: 'hero',
                data: {
                    title: 'Gallery',
                    subtitle: 'Explore our campus life',
                    description: '',
                    primaryCta: '',
                    primaryCtaUrl: '',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
            {
                id: 'tpl_gallery',
                type: 'image-gallery',
                data: {
                    title: 'Campus Gallery',
                    description: '',
                    items: [
                        { image: '', title: 'Photo 1', description: '' },
                        { image: '', title: 'Photo 2', description: '' },
                    ],
                },
            },
        ],
    },
    {
        id: 'contact',
        label: 'Contact',
        description: 'Contact information and map',
        icon: Phone,
        slug: 'contact',
        sections: [
            {
                id: 'tpl_hero',
                type: 'hero',
                data: {
                    title: 'Contact Us',
                    subtitle: 'Get in touch with us',
                    description: '',
                    primaryCta: '',
                    primaryCtaUrl: '',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
            {
                id: 'tpl_contact',
                type: 'contact',
                data: {
                    title: 'Reach Us',
                    description: '',
                    items: [
                        {
                            icon: 'phone',
                            title: 'Phone',
                            value: '+91 98765 43210',
                            description: 'Call us for inquiries',
                        },
                        {
                            icon: 'mail',
                            title: 'Email',
                            value: 'info@gurukul.edu',
                            description: 'Send us an email',
                        },
                        {
                            icon: 'map',
                            title: 'Address',
                            value: 'Knowledge Park Road',
                            description: 'Visit our campus',
                        },
                    ],
                },
            },
        ],
    },
    {
        id: 'faq',
        label: 'FAQ Page',
        description: 'Frequently asked questions with accordion',
        icon: HelpCircle,
        slug: 'faq',
        sections: [
            {
                id: 'tpl_hero',
                type: 'hero',
                data: {
                    title: 'FAQ',
                    subtitle: 'Frequently Asked Questions',
                    description: '',
                    primaryCta: '',
                    primaryCtaUrl: '',
                    secondaryCta: '',
                    secondaryCtaUrl: '',
                },
            },
            {
                id: 'tpl_faq',
                type: 'faq',
                data: {
                    title: 'Common Questions',
                    description: '',
                    items: [
                        { question: 'Question 1?', answer: 'Answer here.' },
                        { question: 'Question 2?', answer: 'Answer here.' },
                    ],
                },
            },
        ],
    },
];

interface WebsitePageData {
    id: number;
    title: string;
    slug: string;
    content: string | { sections?: PageSection[] } | null;
    meta_title: string | null;
    meta_description: string | null;
    featured_image: string | null;
    is_published: boolean;
    sort_order: number;
    template: string | null;
    created_at: string;
    updated_at: string;
}

interface WebsitePagesCmsProps {
    user: any;
    pages: WebsitePageData[];
    editingPageId?: number;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseSections(content: string | null | object): PageSection[] {
    if (!content) return [];
    try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        return Array.isArray(parsed?.sections) ? parsed.sections : [];
    } catch {
        return [];
    }
}

function serializeSections(sections: PageSection[]): string {
    return JSON.stringify({ sections });
}

const SECTION_TYPES = [
    {
        type: 'hero' as const,
        label: 'Hero Banner',
        icon: Megaphone,
        description: 'Full-width banner with title, description, and CTA buttons',
    },
    {
        type: 'text' as const,
        label: 'Rich Text',
        icon: Type,
        description: 'HTML content section with optional title',
    },
    {
        type: 'image-gallery' as const,
        label: 'Image Gallery',
        icon: ImageIcon,
        description: 'Grid of images with titles and captions',
    },
    {
        type: 'features' as const,
        label: 'Features Cards',
        icon: LayoutGrid,
        description: 'Card grid with icons, titles, and descriptions',
    },
    {
        type: 'contact' as const,
        label: 'Contact Info',
        icon: Phone,
        description: 'Contact information cards with icons',
    },
    {
        type: 'cta' as const,
        label: 'Call to Action',
        icon: Megaphone,
        description: 'Bold banner with action buttons',
    },
    {
        type: 'faq' as const,
        label: 'FAQ Accordion',
        icon: HelpCircle,
        description: 'Frequently asked questions with expandable answers',
    },
];

const SECTION_TYPE_COLORS: Record<string, string> = {
    hero: 'bg-blue-100 text-blue-700',
    text: 'bg-slate-100 text-slate-700',
    'image-gallery': 'bg-purple-100 text-purple-700',
    features: 'bg-emerald-100 text-emerald-700',
    contact: 'bg-blue-100 text-blue-700',
    cta: 'bg-rose-100 text-rose-700',
    faq: 'bg-cyan-100 text-cyan-700',
};

function getDefaultSectionData(type: PageSection['type']): Record<string, any> {
    switch (type) {
        case 'hero':
            return {
                title: 'Page Title',
                subtitle: '',
                description: '',
                image: '',
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
                items: [{ image: '', title: '', description: '' }],
            };
        case 'features':
            return {
                title: 'Features',
                description: '',
                items: [{ icon: 'star', title: 'Feature', description: '' }],
            };
        case 'contact':
            return {
                title: 'Contact Us',
                description: '',
                items: [
                    {
                        icon: 'phone',
                        title: 'Phone',
                        value: '',
                        description: '',
                    },
                ],
            };
        case 'cta':
            return {
                title: 'Ready to Get Started?',
                description: '',
                primaryCta: 'Contact Us',
                primaryCtaUrl: '#contact',
                secondaryCta: '',
                secondaryCtaUrl: '',
            };
        case 'faq':
            return {
                title: 'Frequently Asked Questions',
                description: '',
                items: [{ question: 'Question?', answer: 'Answer here.' }],
            };
    }
}

function getSectionTitle(section: PageSection): string {
    switch (section.type) {
        case 'hero':
            return section.data.title || 'Hero Banner';
        case 'text':
            return section.data.title || 'Text Content';
        case 'image-gallery':
            return section.data.title || 'Image Gallery';
        case 'features':
            return section.data.title || 'Features';
        case 'contact':
            return section.data.title || 'Contact Info';
        case 'cta':
            return section.data.title || 'Call to Action';
        case 'faq':
            return section.data.title || 'FAQ';
    }
}

function SectionEditor({
    section,
    onChange,
    onRemove,
}: {
    section: PageSection;
    onChange: (data: Record<string, any>) => void;
    onRemove: () => void;
}) {
    const { t } = useLanguage();
    const updateField = (key: string, value: any) => onChange({ ...section.data, [key]: value });
    const updateArrayItem = (arrayKey: string, index: number, field: string, value: any) => {
        const items = [...(section.data[arrayKey] || [])];
        items[index] = { ...items[index], [field]: value };
        onChange({ ...section.data, [arrayKey]: items });
    };
    const addArrayItem = (arrayKey: string, template: Record<string, any>) => {
        onChange({
            ...section.data,
            [arrayKey]: [...(section.data[arrayKey] || []), { ...template }],
        });
    };
    const removeArrayItem = (arrayKey: string, index: number) => {
        const items = [...(section.data[arrayKey] || [])];
        items.splice(index, 1);
        onChange({ ...section.data, [arrayKey]: items });
    };

    return (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">
                    {t('Edit:')}
                    {getSectionTitle(section)}
                </h4>
                <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-500 hover:text-red-600 h-8">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t('Remove')}
                </Button>
            </div>

            {section.type === 'hero' && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <Label>{t('Title')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label>{t('Subtitle')}</Label>
                        <Input
                            value={section.data.subtitle || ''}
                            onChange={(e) => updateField('subtitle', e.target.value)}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label>{t('Description')}</Label>
                        <Textarea
                            rows={3}
                            value={section.data.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label>{t('Background Image')}</Label>
                        <ImageUpload
                            value={section.data.image || ''}
                            onChange={(url) => updateField('image', url)}
                            onRemove={() => updateField('image', '')}
                            folder="pages/hero"
                        />
                    </div>
                    <div>
                        <Label>{t('Primary Button Text')}</Label>
                        <Input
                            value={section.data.primaryCta || ''}
                            onChange={(e) => updateField('primaryCta', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Primary Button URL')}</Label>
                        <Input
                            value={section.data.primaryCtaUrl || ''}
                            onChange={(e) => updateField('primaryCtaUrl', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Secondary Button Text')}</Label>
                        <Input
                            value={section.data.secondaryCta || ''}
                            onChange={(e) => updateField('secondaryCta', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Secondary Button URL')}</Label>
                        <Input
                            value={section.data.secondaryCtaUrl || ''}
                            onChange={(e) => updateField('secondaryCtaUrl', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {section.type === 'text' && (
                <div className="space-y-3">
                    <div>
                        <Label>{t('Title (optional)')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Content (HTML)')}</Label>
                        <Textarea
                            rows={8}
                            value={section.data.content || ''}
                            onChange={(e) => updateField('content', e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>
                </div>
            )}

            {section.type === 'image-gallery' && (
                <div className="space-y-3">
                    <div>
                        <Label>{t('Gallery Title')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Description')}</Label>
                        <Textarea
                            rows={2}
                            value={section.data.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>{t('Images')}</Label>
                        {(section.data.items || []).map((item: any, i: number) => {
                            return (
                                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">
                                            {t('Image')}
                                            {i + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('items', i)}
                                            className="text-red-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <ImageUpload
                                        value={item.image || ''}
                                        onChange={(url) => updateArrayItem('items', i, 'image', url)}
                                        onRemove={() => updateArrayItem('items', i, 'image', '')}
                                        folder="pages/gallery"
                                    />

                                    <Input
                                        placeholder={t('Title')}
                                        value={item.title || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'title', e.target.value)}
                                    />

                                    <Input
                                        placeholder={t('Description')}
                                        value={item.description || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'description', e.target.value)}
                                    />
                                </div>
                            );
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                addArrayItem('items', {
                                    image: '',
                                    title: '',
                                    description: '',
                                })
                            }
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t('Add Image')}
                        </Button>
                    </div>
                </div>
            )}

            {section.type === 'features' && (
                <div className="space-y-3">
                    <div>
                        <Label>{t('Title')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Description')}</Label>
                        <Textarea
                            rows={2}
                            value={section.data.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>{t('Cards')}</Label>
                        {(section.data.items || []).map((item: any, i: number) => {
                            return (
                                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">
                                            {t('Card')}
                                            {i + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('items', i)}
                                            className="text-red-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <Input
                                        placeholder={t('Title')}
                                        value={item.title || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'title', e.target.value)}
                                    />

                                    <Textarea
                                        placeholder={t('Description')}
                                        rows={2}
                                        value={item.description || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'description', e.target.value)}
                                    />
                                </div>
                            );
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                addArrayItem('items', {
                                    icon: 'star',
                                    title: '',
                                    description: '',
                                })
                            }
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t('Add Card')}
                        </Button>
                    </div>
                </div>
            )}

            {section.type === 'contact' && (
                <div className="space-y-3">
                    <div>
                        <Label>{t('Title')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Description')}</Label>
                        <Textarea
                            rows={2}
                            value={section.data.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>{t('Contact Items')}</Label>
                        {(section.data.items || []).map((item: any, i: number) => {
                            return (
                                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">
                                            {t('Item')}
                                            {i + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('items', i)}
                                            className="text-red-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder={t('Title (e.g. Phone)')}
                                            value={item.title || ''}
                                            onChange={(e) => updateArrayItem('items', i, 'title', e.target.value)}
                                        />

                                        <Input
                                            placeholder={t('Value (e.g. +91 12345)')}
                                            value={item.value || ''}
                                            onChange={(e) => updateArrayItem('items', i, 'value', e.target.value)}
                                        />
                                    </div>
                                    <Input
                                        placeholder={t('Description')}
                                        value={item.description || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'description', e.target.value)}
                                    />
                                </div>
                            );
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                addArrayItem('items', {
                                    icon: 'phone',
                                    title: '',
                                    value: '',
                                    description: '',
                                })
                            }
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t('Add Item')}
                        </Button>
                    </div>
                </div>
            )}

            {section.type === 'cta' && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <Label>{t('Title')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label>{t('Description')}</Label>
                        <Textarea
                            rows={2}
                            value={section.data.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Primary Button Text')}</Label>
                        <Input
                            value={section.data.primaryCta || ''}
                            onChange={(e) => updateField('primaryCta', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Primary Button URL')}</Label>
                        <Input
                            value={section.data.primaryCtaUrl || ''}
                            onChange={(e) => updateField('primaryCtaUrl', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Secondary Button Text')}</Label>
                        <Input
                            value={section.data.secondaryCta || ''}
                            onChange={(e) => updateField('secondaryCta', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Secondary Button URL')}</Label>
                        <Input
                            value={section.data.secondaryCtaUrl || ''}
                            onChange={(e) => updateField('secondaryCtaUrl', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {section.type === 'faq' && (
                <div className="space-y-3">
                    <div>
                        <Label>{t('Title')}</Label>
                        <Input
                            value={section.data.title || ''}
                            onChange={(e) => updateField('title', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>{t('Description')}</Label>
                        <Textarea
                            rows={2}
                            value={section.data.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>{t('Questions & Answers')}</Label>
                        {(section.data.items || []).map((item: any, i: number) => {
                            return (
                                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">
                                            {t('Q&A')}
                                            {i + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeArrayItem('items', i)}
                                            className="text-red-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <Input
                                        placeholder={t('Question')}
                                        value={item.question || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'question', e.target.value)}
                                    />

                                    <Textarea
                                        placeholder={t('Answer')}
                                        rows={3}
                                        value={item.answer || ''}
                                        onChange={(e) => updateArrayItem('items', i, 'answer', e.target.value)}
                                    />
                                </div>
                            );
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                addArrayItem('items', {
                                    question: '',
                                    answer: '',
                                })
                            }
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t('Add Q&A')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WebsitePagesCms({ user, pages, editingPageId }: WebsitePagesCmsProps) {
    const { t } = useLanguage();
    const { errors, flash } = usePage().props as any;
    const [view, setView] = useState<'list' | 'template-picker' | 'editor'>('list');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAddPalette, setShowAddPalette] = useState(false);
    const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');
    const [isPublished, setIsPublished] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);
    const [sections, setSections] = useState<PageSection[]>([]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        if (editingPageId) {
            const page = pages.find((p) => p.id === editingPageId);
            if (page) {
                openEditor(page);
            }
        }
    }, [editingPageId]);

    const resetEditor = () => {
        setEditingId(null);
        setTitle('');
        setSlug('');
        setSlugManuallyEdited(false);
        setMetaTitle('');
        setMetaDescription('');
        setFeaturedImage('');
        setIsPublished(true);
        setSortOrder(0);
        setSections([]);
        setEditingSectionIndex(null);
        setShowAddPalette(false);
    };

    const openEditor = (page?: WebsitePageData, templateSections?: PageSection[]) => {
        if (page) {
            setEditingId(page.id);
            setTitle(page.title);
            setSlug(page.slug);
            setSlugManuallyEdited(true);
            setMetaTitle(page.meta_title ?? '');
            setMetaDescription(page.meta_description ?? '');
            setFeaturedImage(page.featured_image ?? '');
            setIsPublished(page.is_published);
            setSortOrder(page.sort_order);
            setSections(parseSections(page.content));
        } else {
            resetEditor();
            if (templateSections) {
                setSections(templateSections.map((s) => ({ ...s, id: generateId() })));
            }
        }
        setEditingSectionIndex(null);
        setShowAddPalette(false);
        setView('editor');
    };

    const handleSelectTemplate = (template: PageTemplate) => {
        setTitle(template.label);
        setSlug(slugify(template.label));
        setSlugManuallyEdited(false);
        openEditor(undefined, template.sections.length > 0 ? template.sections : undefined);
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
        if (!slugManuallyEdited) setSlug(slugify(value));
    };

    const handleSlugChange = (value: string) => {
        setSlugManuallyEdited(true);
        setSlug(slugify(value));
    };

    const addSection = (type: PageSection['type']) => {
        const newSection: PageSection = {
            id: generateId(),
            type,
            data: getDefaultSectionData(type),
        };
        setSections((prev) => [...prev, newSection]);
        setEditingSectionIndex(sections.length);
        setShowAddPalette(false);
    };

    const updateSection = (index: number, data: Record<string, any>) => {
        setSections((prev) => prev.map((s, i) => (i === index ? { ...s, data } : s)));
    };

    const removeSection = (index: number) => {
        setSections((prev) => prev.filter((_, i) => i !== index));
        if (editingSectionIndex === index) setEditingSectionIndex(null);
        else if (editingSectionIndex !== null && editingSectionIndex > index)
            setEditingSectionIndex(editingSectionIndex - 1);
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= sections.length) return;
        setSections((prev) => {
            const arr = [...prev];
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
        if (editingSectionIndex === index) setEditingSectionIndex(target);
        else if (editingSectionIndex === target) setEditingSectionIndex(index);
    };

    const handleSave = () => {
        const payload = {
            title,
            slug,
            content: serializeSections(sections),
            meta_title: metaTitle || null,
            meta_description: metaDescription || null,
            featured_image: featuredImage || null,
            is_published: isPublished,
            sort_order: sortOrder,
            template: 'template5',
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setView('list');
                resetEditor();
            },
        };

        if (editingId) {
            router.patch(`/website-pages/${editingId}`, payload, options);
        } else {
            router.post('/website-pages', payload, options);
        }
    };

    const handleDelete = (page: WebsitePageData) => {
        if (!window.confirm(`Delete "${page.title}" permanently?`)) return;
        router.delete(`/website-pages/${page.id}`, { preserveScroll: true });
    };

    const sortedPages = [...pages].sort((a, b) => a.sort_order - b.sort_order);

    return (
        <DashboardLayout user={user} activeTab="website-pages">
            <div className="space-y-6 p-8">
                {view === 'list' ? (
                    <>
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 xl:max-w-sm">
                                <h1 className="text-3xl font-bold text-slate-900">{t('Website Pages')}</h1>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {t(
                                        'Create and manage pages for your Template 5 website with section-based editors.',
                                    )}
                                </p>
                            </div>
                            <Button
                                className="gap-2 self-start md:shrink-0"
                                onClick={() => {
                                    resetEditor();
                                    setView('template-picker');
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                {t('Create New Page')}
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Total pages')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{pages.length}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Published')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                                        {pages.filter((p) => p.is_published).length}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-slate-500">{t('Drafts')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                                        {pages.filter((p) => !p.is_published).length}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    {t('All Pages')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Manage the content pages visible on your public website.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {sortedPages.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                                        {t('No pages created yet. Click "Create New Page" to get started.')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Title')}</TableHead>
                                                    <TableHead>{t('Slug')}</TableHead>
                                                    <TableHead>{t('Sections')}</TableHead>
                                                    <TableHead>{t('Status')}</TableHead>
                                                    <TableHead className="text-center">{t('Sort')}</TableHead>
                                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedPages.map((page) => {
                                                    const sectionCount = parseSections(page.content).length;
                                                    return (
                                                        <TableRow key={page.id}>
                                                            <TableCell className="font-medium text-slate-900">
                                                                {t(page.title)}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-slate-500">
                                                                /{page.slug}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-slate-200 bg-slate-50 text-slate-600"
                                                                >
                                                                    {sectionCount}
                                                                    {t('sections')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        page.is_published
                                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                            : 'border-blue-200 bg-blue-50 text-blue-700'
                                                                    }
                                                                >
                                                                    {page.is_published ? t('Published') : t('Draft')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center text-slate-600">
                                                                {page.sort_order}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                                        asChild
                                                                    >
                                                                        <a
                                                                            href={`/pages/${page.slug}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                                                                        onClick={() => openEditor(page)}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                                                                        onClick={() => handleDelete(page)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : view === 'template-picker' ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t('Back')}
                            </Button>
                            <h1 className="text-2xl font-bold text-slate-900">{t('Choose a Page Template')}</h1>
                        </div>
                        <p className="text-sm text-slate-600">
                            {t('Select a template to start with, or choose a blank page to build from scratch.')}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {PAGE_TEMPLATES.map((template) => {
                                const Icon = template.icon;
                                return (
                                    <Card
                                        key={template.id}
                                        className="cursor-pointer border-2 transition hover:border-blue-400 hover:shadow-md"
                                        onClick={() => handleSelectTemplate(template)}
                                    >
                                        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                                                <Icon className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{t(template.label)}</h3>
                                                <p className="mt-1 text-xs text-slate-500">{t(template.description)}</p>
                                            </div>
                                            {template.sections.length > 0 && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {template.sections.length}
                                                    {t('sections')}
                                                </Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setView('list');
                                    resetEditor();
                                }}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t('Back')}
                            </Button>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {editingId ? t('Edit Page') : t('Create New Page')}
                            </h1>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-3">
                            <div className="space-y-4 xl:col-span-1">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">{t('Page Settings')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <Label>{t('Title *')}</Label>
                                            <Input
                                                value={title}
                                                onChange={(e) => handleTitleChange(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label>{t('Slug *')}</Label>
                                            <Input
                                                value={slug}
                                                onChange={(e) => handleSlugChange(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label>{t('Featured Image')}</Label>
                                            <ImageUpload
                                                value={featuredImage}
                                                onChange={setFeaturedImage}
                                                onRemove={() => setFeaturedImage('')}
                                                folder="pages/featured"
                                            />
                                        </div>
                                        <div>
                                            <Label>{t('Meta Title')}</Label>
                                            <Input
                                                value={metaTitle}
                                                onChange={(e) => setMetaTitle(e.target.value)}
                                                placeholder={t('For SEO')}
                                            />
                                        </div>
                                        <div>
                                            <Label>{t('Meta Description')}</Label>
                                            <Textarea
                                                rows={2}
                                                value={metaDescription}
                                                onChange={(e) => setMetaDescription(e.target.value)}
                                                placeholder={t('For search engines')}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                                                <Label className="cursor-pointer">{t('Published')}</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label>{t('Sort')}</Label>
                                                <Input
                                                    type="number"
                                                    className="w-16"
                                                    value={sortOrder}
                                                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4 xl:col-span-2">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">
                                            {t('Page Sections (')}
                                            {sections.length})
                                        </CardTitle>
                                        <CardDescription>
                                            {t('Add, remove, and reorder content sections.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {sections.map((section, index) => (
                                            <div key={section.id}>
                                                <div
                                                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition ${editingSectionIndex === index ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveSection(index, 'up')}
                                                            disabled={index === 0}
                                                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                                        >
                                                            <ArrowUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveSection(index, 'down')}
                                                            disabled={index === sections.length - 1}
                                                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                                        >
                                                            <ArrowDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <div
                                                        className="flex-1 min-w-0 cursor-pointer"
                                                        onClick={() =>
                                                            setEditingSectionIndex(
                                                                editingSectionIndex === index ? null : index,
                                                            )
                                                        }
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] ${SECTION_TYPE_COLORS[section.type]}`}
                                                            >
                                                                {t(section.type)}
                                                            </Badge>
                                                            <span className="truncate text-sm font-medium text-slate-700">
                                                                {getSectionTitle(section)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSection(index)}
                                                        className="text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                {editingSectionIndex === index && (
                                                    <div className="mt-2">
                                                        <SectionEditor
                                                            section={section}
                                                            onChange={(data) => updateSection(index, data)}
                                                            onRemove={() => removeSection(index)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {showAddPalette ? (
                                            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                                                <p className="text-xs font-medium text-blue-700">
                                                    {t('Choose section type:')}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                                    {SECTION_TYPES.map((st) => {
                                                        const Icon = st.icon;
                                                        return (
                                                            <button
                                                                key={st.type}
                                                                type="button"
                                                                onClick={() => addSection(st.type)}
                                                                className="flex flex-col items-center gap-1.5 rounded-lg border border-white bg-white p-3 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md"
                                                            >
                                                                <Icon className="h-5 w-5 text-blue-600" />
                                                                <span className="text-xs font-medium text-slate-700">
                                                                    {t(st.label)}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddPalette(false)}
                                                    className="text-xs text-slate-500 hover:text-slate-700"
                                                >
                                                    {t('Cancel')}
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full border-dashed"
                                                onClick={() => setShowAddPalette(true)}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('Add Section')}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setView('list');
                                            resetEditor();
                                        }}
                                    >
                                        {t('Cancel')}
                                    </Button>
                                    <Button onClick={handleSave}>
                                        <Save className="h-4 w-4 mr-2" />{' '}
                                        {editingId ? t('Save Changes') : t('Create Page')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
