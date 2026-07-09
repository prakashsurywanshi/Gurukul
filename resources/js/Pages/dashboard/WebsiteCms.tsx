import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
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
  normalizeWebsiteCmsContent,
  normalizeWebsiteContent,
  WebsiteCmsContent,
  WebsiteContent,
  websiteThemes,
  WebsiteTemplateKey,
  WebsiteThemeKey,
} from '../../utils/websiteCmsContent';

interface WebsiteCmsProps {
  user: any;
  websiteContent?: Partial<WebsiteContent> | Partial<WebsiteCmsContent> | null;
}

type TemplateSectionKey = 'template1' | 'template2' | 'template3' | 'template4';

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
    description: 'Classic school website with top contact bar, colorful tabs, gallery, events, contact, and admissions flow.',
  },
];

const sharedFields: Array<FieldConfig> = [
  { key: 'seoTitle', label: 'SEO title' },
  { key: 'brandName', label: 'Brand name' },
  { key: 'brandSubtitle', label: 'Brand subtitle' },
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
  { key: 'templateFourAboutDescription', label: 'About description', rows: 4 },
];

const templateFourGalleryFields: Array<FieldConfig> = [
  { key: 'templateFourGalleryTitle', label: 'Gallery title', rows: 3 },
  { key: 'templateFourGalleryDescription', label: 'Gallery description', rows: 4 },
];

const templateFourEventsFields: Array<FieldConfig> = [
  { key: 'templateFourEventsTitle', label: 'Events title', rows: 3 },
  { key: 'templateFourEventsDescription', label: 'Events description', rows: 4 },
];

const templateFourContactFields: Array<FieldConfig> = [
  { key: 'templateFourContactTitle', label: 'Contact title', rows: 3 },
  { key: 'templateFourContactDescription', label: 'Contact description', rows: 4 },
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

  return content.heroBadge;
}

function getPreviewTitle(content: WebsiteContent) {
  if (content.activeTemplate === 'template2') {
    return content.templateTwoHeroTitle;
  }

  if (content.activeTemplate === 'template4') {
    return content.templateFourHeroTitle;
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

  return content.heroDescription;
}

function ArrayEditor({ title, description, items, fields, onChange }: ArrayEditorProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-4 text-sm font-semibold text-slate-900">{title} {index + 1}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={`${title}-${index}-${field.key}`} className={field.rows ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                  <Label>{field.label}</Label>
                  {field.rows ? (
                    <Textarea
                      rows={field.rows}
                      value={item[field.key] ?? ''}
                      onChange={(event) => onChange(index, field.key, event.target.value)}
                    />
                  ) : (
                    <Input value={item[field.key] ?? ''} onChange={(event) => onChange(index, field.key, event.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

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
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.rows ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
            <Label>{field.label}</Label>
            {field.rows ? (
              <Textarea rows={field.rows} value={data[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)} />
            ) : (
              <Input value={data[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)} />
            )}
          </div>
        ))}
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Highlights</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{content.highlights.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Slider Images</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{content.sliderImages.length}</p>
        </div>
      </div>
    </div>
  );
}

export default function WebsiteCms({ user, websiteContent }: WebsiteCmsProps) {
  const [content, setContent] = useState<WebsiteCmsContent>(() => normalizeWebsiteCmsContent(websiteContent));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSliderImage, setIsUploadingSliderImage] = useState(false);
  const [deletingSliderImageIndex, setDeletingSliderImageIndex] = useState<number | null>(null);

  const templateOnePreview = useMemo(() => normalizeWebsiteContent(content, 'template1'), [content]);
  const templateTwoPreview = useMemo(() => normalizeWebsiteContent(content, 'template2'), [content]);
  const templateThreePreview = useMemo(() => normalizeWebsiteContent(content, 'template3'), [content]);
  const templateFourPreview = useMemo(() => normalizeWebsiteContent(content, 'template4'), [content]);

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

  const updateTemplateArrayItem = (template: TemplateSectionKey, key: string, index: number, field: string, value: string) => {
    setContent((current) => {
      const items = Array.isArray(current[template][key]) ? (current[template][key] as Array<Record<string, string>>) : [];

      return {
        ...current,
        [template]: {
          ...current[template],
          [key]: items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
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
      <form onSubmit={handleSave} className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">Website CMS</Badge>
                <Badge className="border border-emerald-200/30 bg-emerald-400/15 text-emerald-50 hover:bg-emerald-400/15">
                  Template-Wise Content
                </Badge>
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Manage each website template separately</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100 md:text-base">
                Shared brand details now stay separate from template content. Template 1, Template 2, and Template 3 each have their own CMS section so content no longer gets mixed together.
              </p>
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Publish Controls
                </CardTitle>
                <CardDescription>Choose the active template and save all website CMS sections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Website brand</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{content.shared.brandName}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">Active template</p>
                  <p className="mt-2 text-xl font-semibold text-blue-900">{getTemplateLabel(content.activeTemplate)}</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-700">Public theme</p>
                  <p className="mt-2 text-xl font-semibold text-indigo-900">{websiteThemes[content.theme].name}</p>
                  <p className="mt-1 text-sm text-indigo-700/80">{websiteThemes[content.theme].description}</p>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Website CMS'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="shared" className="space-y-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-white p-2 shadow-sm">
              <TabsTrigger value="shared" className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Shared CMS
              </TabsTrigger>
              <TabsTrigger value="template1" className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Template 1
              </TabsTrigger>
              <TabsTrigger value="template2" className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Template 2
              </TabsTrigger>
              <TabsTrigger value="template3" className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Template 3
              </TabsTrigger>
              <TabsTrigger value="template4" className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Template 4
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shared" className="space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <LayoutTemplate className="h-5 w-5 text-blue-600" />
                    Shared Website Settings
                  </CardTitle>
                  <CardDescription>These values are reused across all templates.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Active website template</Label>
                    <Select
                      value={content.activeTemplate}
                      onValueChange={(value: WebsiteTemplateKey) => setContent((current) => ({ ...current, activeTemplate: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select active template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select
                      value={content.theme}
                      onValueChange={(value: WebsiteThemeKey) => setContent((current) => ({ ...current, theme: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
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
                </CardContent>
              </Card>

              <FieldGrid
                title="Shared Brand, SEO, and Navigation"
                description="Update common branding and navigation labels once for all templates."
                data={content.shared as Record<string, string>}
                fields={sharedFields}
                onChange={updateSharedField}
              />

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Shared Slider Images
                  </CardTitle>
                  <CardDescription>These images can be reused by the homepage templates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Label
                      htmlFor="slider-image-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingSliderImage ? 'Uploading...' : 'Upload Slider Image'}
                    </Label>
                    <input
                      id="slider-image-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleSliderImageUpload}
                    />
                    <p className="text-sm text-slate-500">{content.sliderImages.length} image(s) available</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {content.sliderImages.map((image, index) => (
                      <div key={image} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <img src={image} alt={`Slider ${index + 1}`} className="h-52 w-full object-cover" />
                        <div className="flex items-center justify-between p-4">
                          <p className="text-sm font-medium text-slate-900">Image {index + 1}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={deletingSliderImageIndex === index}
                            onClick={() => handleSliderImageDelete(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingSliderImageIndex === index ? 'Deleting...' : 'Delete'}
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
                title="Template 1 Hero"
                description="Template 1 keeps the classic homepage hero and first screen messaging."
                data={content.template1 as Record<string, string>}
                fields={templateHeroFields}
                onChange={(key, value) => updateTemplateField('template1', key, value)}
              />

              <ArrayEditor
                title="Template 1 Highlights"
                description="Homepage top metrics for Template 1."
                items={(content.template1.highlights as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'value', label: 'Value' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'highlights', index, field, value)}
              />

              <FieldGrid
                title="Template 1 Spotlight and About"
                description="Campus spotlight, open house, and about section copy."
                data={content.template1 as Record<string, string>}
                fields={[
                  { key: 'featureEyebrow', label: 'Spotlight eyebrow' },
                  { key: 'featureTitle', label: 'Spotlight title', rows: 3 },
                  { key: 'openHouseLabel', label: 'Open house label' },
                  { key: 'openHouseDescription', label: 'Open house description', rows: 3 },
                  { key: 'openHouseDate', label: 'Open house date' },
                  { key: 'liveOverviewValue', label: 'Live overview value' },
                  { key: 'liveOverviewLabel', label: 'Live overview label', rows: 2 },
                  { key: 'aboutEyebrow', label: 'About eyebrow' },
                  { key: 'aboutTitle', label: 'About title', rows: 3 },
                  { key: 'aboutDescription', label: 'About description', rows: 4 },
                ]}
                onChange={(key, value) => updateTemplateField('template1', key, value)}
              />

              <ArrayEditor
                title="Template 1 Features"
                description="Feature cards used in the classic admissions layout."
                items={(content.template1.features as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'features', index, field, value)}
              />

              <ArrayEditor
                title="Template 1 Pillars"
                description="Core trust and campus support points."
                items={(content.template1.pillars as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'text', label: 'Text', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'pillars', index, field, value)}
              />

              <FieldGrid
                title="Template 1 Programs"
                description="Academic journey section for Template 1."
                data={content.template1 as Record<string, string>}
                fields={[
                  { key: 'programsEyebrow', label: 'Programs eyebrow' },
                  { key: 'programsTitle', label: 'Programs title', rows: 3 },
                  { key: 'programsDescription', label: 'Programs description', rows: 4 },
                ]}
                onChange={(key, value) => updateTemplateField('template1', key, value)}
              />

              <ArrayEditor
                title="Template 1 Programs List"
                description="Program cards for the classic homepage."
                items={(content.template1.programs as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'age', label: 'Stage / Age' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'programs', index, field, value)}
              />

              <FieldGrid
                title="Template 1 Campus, Outcomes, Journey, and Visit"
                description="Main editorial sections for campus life and admissions storytelling."
                data={content.template1 as Record<string, string>}
                fields={[
                  { key: 'campusEyebrow', label: 'Campus eyebrow' },
                  { key: 'campusTitle', label: 'Campus title', rows: 3 },
                  { key: 'campusDescription', label: 'Campus description', rows: 4 },
                  { key: 'newsEyebrow', label: 'News eyebrow' },
                  { key: 'outcomesEyebrow', label: 'Outcomes eyebrow' },
                  { key: 'outcomesTitle', label: 'Outcomes title', rows: 3 },
                  { key: 'outcomesDescription', label: 'Outcomes description', rows: 4 },
                  { key: 'journeyEyebrow', label: 'Journey eyebrow' },
                  { key: 'journeyTitle', label: 'Journey title', rows: 3 },
                  { key: 'journeyDescription', label: 'Journey description', rows: 4 },
                  { key: 'voicesEyebrow', label: 'Testimonials eyebrow' },
                  { key: 'voicesTitle', label: 'Testimonials title', rows: 3 },
                  { key: 'visitEyebrow', label: 'Visit eyebrow' },
                  { key: 'visitTitle', label: 'Visit title', rows: 3 },
                  { key: 'visitPointOneTitle', label: 'Visit point one title' },
                  { key: 'visitPointOneText', label: 'Visit point one text', rows: 3 },
                  { key: 'visitPointTwoTitle', label: 'Visit point two title' },
                  { key: 'visitPointTwoText', label: 'Visit point two text', rows: 3 },
                  { key: 'visitPointThreeTitle', label: 'Visit point three title' },
                  { key: 'visitPointThreeText', label: 'Visit point three text', rows: 3 },
                  { key: 'visitPrimaryCta', label: 'Visit primary CTA' },
                  { key: 'visitSecondaryCta', label: 'Visit secondary CTA' },
                  { key: 'faqEyebrow', label: 'FAQ eyebrow' },
                  { key: 'faqTitle', label: 'FAQ title', rows: 3 },
                ]}
                onChange={(key, value) => updateTemplateField('template1', key, value)}
              />

              <ArrayEditor
                title="Template 1 Campus Stats"
                description="Campus metrics shown in the campus section."
                items={(content.template1.campusStats as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'value', label: 'Value' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'campusStats', index, field, value)}
              />

              <ArrayEditor
                title="Template 1 News"
                description="Latest news cards for Template 1."
                items={(content.template1.news as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'detail', label: 'Detail', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'news', index, field, value)}
              />

              <ArrayEditor
                title="Template 1 Outcomes"
                description="Outcome cards shown after campus storytelling."
                items={(content.template1.outcomes as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'outcomes', index, field, value)}
              />

              <ArrayEditor
                title="Template 1 Journey Steps"
                description="Admissions journey steps for families."
                items={(content.template1.journeySteps as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'step', label: 'Step number' },
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'journeySteps', index, field, value)}
              />

              <ArrayEditor
                title="Template 1 Testimonials"
                description="Parent, student, and faculty voice cards."
                items={(content.template1.testimonials as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'quote', label: 'Quote', rows: 3 },
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'testimonials', index, field, value)}
              />

              <ArrayEditor
                title="Template 1 FAQs"
                description="Frequently asked questions for the classic homepage."
                items={(content.template1.faqs as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'question', label: 'Question' },
                  { key: 'answer', label: 'Answer', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template1', 'faqs', index, field, value)}
              />

              <FieldGrid
                title="Template 1 Admissions"
                description="Classic admissions and enquiry copy for Template 1."
                data={content.template1 as Record<string, string>}
                fields={templateAdmissionsFields}
                onChange={(key, value) => updateTemplateField('template1', key, value)}
              />
            </TabsContent>

            <TabsContent value="template2" className="space-y-6">
              <FieldGrid
                title="Template 2 Hero"
                description="Template 2 has its own modern hero content and motion-first messaging."
                data={content.template2 as Record<string, string>}
                fields={[
                  { key: 'templateTwoHeroEyebrow', label: 'Hero eyebrow' },
                  { key: 'templateTwoHeroTitle', label: 'Hero title', rows: 3 },
                  { key: 'templateTwoHeroDescription', label: 'Hero description', rows: 4 },
                  { key: 'templateTwoHeroPrimaryCta', label: 'Primary CTA' },
                  { key: 'templateTwoHeroSecondaryCta', label: 'Secondary CTA' },
                  { key: 'templateTwoHeroFloatingLabel', label: 'Floating label' },
                ]}
                onChange={(key, value) => updateTemplateField('template2', key, value)}
              />

              <ArrayEditor
                title="Template 2 Highlights"
                description="Top metric cards shown in the Template 2 hero area."
                items={(content.template2.highlights as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'value', label: 'Value' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template2', 'highlights', index, field, value)}
              />

              <ArrayEditor
                title="Template 2 Slides"
                description="3D slider cards for the modern homepage."
                items={(content.template2.templateTwoSlides as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'eyebrow', label: 'Eyebrow' },
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                  { key: 'metric', label: 'Metric' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template2', 'templateTwoSlides', index, field, value)}
              />

              <FieldGrid
                title="Template 2 About"
                description="About copy shown below the 3D hero experience."
                data={content.template2 as Record<string, string>}
                fields={[
                  { key: 'templateTwoAboutEyebrow', label: 'About eyebrow' },
                  { key: 'templateTwoAboutTitle', label: 'About title', rows: 3 },
                  { key: 'templateTwoAboutDescription', label: 'About description', rows: 4 },
                ]}
                onChange={(key, value) => updateTemplateField('template2', key, value)}
              />

              <ArrayEditor
                title="Template 2 About Cards"
                description="Small supporting cards in the about section."
                items={(content.template2.templateTwoAboutCards as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template2', 'templateTwoAboutCards', index, field, value)}
              />

              <FieldGrid
                title="Template 2 Gallery"
                description="Gallery intro copy for the immersive visual section."
                data={content.template2 as Record<string, string>}
                fields={[
                  { key: 'templateTwoGalleryEyebrow', label: 'Gallery eyebrow' },
                  { key: 'templateTwoGalleryTitle', label: 'Gallery title', rows: 3 },
                  { key: 'templateTwoGalleryDescription', label: 'Gallery description', rows: 4 },
                ]}
                onChange={(key, value) => updateTemplateField('template2', key, value)}
              />

              <ArrayEditor
                title="Template 2 Gallery Items"
                description="Gallery cards used in the modern visual grid."
                items={(content.template2.templateTwoGalleryItems as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'category', label: 'Category' },
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template2', 'templateTwoGalleryItems', index, field, value)}
              />

              <FieldGrid
                title="Template 2 Admissions"
                description="Separate admissions copy for the Template 2 landing experience."
                data={content.template2 as Record<string, string>}
                fields={templateAdmissionsFields}
                onChange={(key, value) => updateTemplateField('template2', key, value)}
              />

              <FieldGrid
                title="Template 2 Contact"
                description="Template 2 contact section headline and CTA controls."
                data={content.template2 as Record<string, string>}
                fields={[
                  { key: 'templateTwoContactEyebrow', label: 'Contact eyebrow' },
                  { key: 'templateTwoContactTitle', label: 'Contact title', rows: 3 },
                  { key: 'templateTwoContactDescription', label: 'Contact description', rows: 4 },
                  { key: 'templateTwoContactPrimaryCta', label: 'Primary CTA' },
                  { key: 'templateTwoContactSecondaryCta', label: 'Secondary CTA' },
                ]}
                onChange={(key, value) => updateTemplateField('template2', key, value)}
              />

              <ArrayEditor
                title="Template 2 Contact Items"
                description="Contact cards for email, phone, visit, or enquiry details."
                items={(content.template2.templateTwoContactItems as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'value', label: 'Value' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template2', 'templateTwoContactItems', index, field, value)}
              />
            </TabsContent>

            <TabsContent value="template3" className="space-y-6">
              <FieldGrid
                title="Template 3 Hero"
                description="Template 3 has its own editorial hero and heritage-style messaging."
                data={content.template3 as Record<string, string>}
                fields={templateHeroFields}
                onChange={(key, value) => updateTemplateField('template3', key, value)}
              />

              <ArrayEditor
                title="Template 3 Highlights"
                description="Hero metrics shown in the Template 3 experience."
                items={(content.template3.highlights as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'value', label: 'Value' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'highlights', index, field, value)}
              />

              <FieldGrid
                title="Template 3 Spotlight and About"
                description="Editorial spotlight, open house, and institution story content."
                data={content.template3 as Record<string, string>}
                fields={[
                  { key: 'featureEyebrow', label: 'Spotlight eyebrow' },
                  { key: 'featureTitle', label: 'Spotlight title', rows: 3 },
                  { key: 'openHouseLabel', label: 'Open house label' },
                  { key: 'openHouseDescription', label: 'Open house description', rows: 3 },
                  { key: 'openHouseDate', label: 'Open house date' },
                  { key: 'liveOverviewValue', label: 'Live overview value' },
                  { key: 'liveOverviewLabel', label: 'Live overview label', rows: 2 },
                  { key: 'aboutEyebrow', label: 'About eyebrow' },
                  { key: 'aboutTitle', label: 'About title', rows: 3 },
                  { key: 'aboutDescription', label: 'About description', rows: 4 },
                ]}
                onChange={(key, value) => updateTemplateField('template3', key, value)}
              />

              <ArrayEditor
                title="Template 3 Pillars"
                description="Trust and campus experience cards for Template 3."
                items={(content.template3.pillars as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'text', label: 'Text', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'pillars', index, field, value)}
              />

              <FieldGrid
                title="Template 3 Programs, Campus, and Outcomes"
                description="The core editorial sections unique to Template 3."
                data={content.template3 as Record<string, string>}
                fields={[
                  { key: 'programsEyebrow', label: 'Programs eyebrow' },
                  { key: 'programsTitle', label: 'Programs title', rows: 3 },
                  { key: 'programsDescription', label: 'Programs description', rows: 4 },
                  { key: 'campusEyebrow', label: 'Campus eyebrow' },
                  { key: 'campusTitle', label: 'Campus title', rows: 3 },
                  { key: 'campusDescription', label: 'Campus description', rows: 4 },
                  { key: 'newsEyebrow', label: 'News eyebrow' },
                  { key: 'outcomesEyebrow', label: 'Outcomes eyebrow' },
                  { key: 'outcomesTitle', label: 'Outcomes title', rows: 3 },
                  { key: 'outcomesDescription', label: 'Outcomes description', rows: 4 },
                  { key: 'journeyEyebrow', label: 'Journey eyebrow' },
                  { key: 'journeyTitle', label: 'Journey title', rows: 3 },
                  { key: 'journeyDescription', label: 'Journey description', rows: 4 },
                  { key: 'voicesEyebrow', label: 'Voices eyebrow' },
                  { key: 'voicesTitle', label: 'Voices title', rows: 3 },
                  { key: 'visitEyebrow', label: 'Visit eyebrow' },
                  { key: 'visitTitle', label: 'Visit title', rows: 3 },
                  { key: 'visitPointOneTitle', label: 'Visit point one title' },
                  { key: 'visitPointOneText', label: 'Visit point one text', rows: 3 },
                  { key: 'visitPointTwoTitle', label: 'Visit point two title' },
                  { key: 'visitPointTwoText', label: 'Visit point two text', rows: 3 },
                  { key: 'visitPointThreeTitle', label: 'Visit point three title' },
                  { key: 'visitPointThreeText', label: 'Visit point three text', rows: 3 },
                  { key: 'visitPrimaryCta', label: 'Visit primary CTA' },
                  { key: 'visitSecondaryCta', label: 'Visit secondary CTA' },
                ]}
                onChange={(key, value) => updateTemplateField('template3', key, value)}
              />

              <ArrayEditor
                title="Template 3 Programs"
                description="Programs list for the heritage editorial homepage."
                items={(content.template3.programs as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'age', label: 'Stage / Age' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'programs', index, field, value)}
              />

              <ArrayEditor
                title="Template 3 Campus Stats"
                description="Campus metrics for Template 3."
                items={(content.template3.campusStats as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'value', label: 'Value' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'campusStats', index, field, value)}
              />

              <ArrayEditor
                title="Template 3 News"
                description="Latest highlights used in the editorial layout."
                items={(content.template3.news as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'detail', label: 'Detail', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'news', index, field, value)}
              />

              <ArrayEditor
                title="Template 3 Outcomes"
                description="Outcome cards for the heritage homepage."
                items={(content.template3.outcomes as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'outcomes', index, field, value)}
              />

              <ArrayEditor
                title="Template 3 Journey Steps"
                description="Admissions journey steps for Template 3."
                items={(content.template3.journeySteps as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'step', label: 'Step number' },
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'journeySteps', index, field, value)}
              />

              <ArrayEditor
                title="Template 3 Testimonials"
                description="Voice cards for the heritage editorial template."
                items={(content.template3.testimonials as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'quote', label: 'Quote', rows: 3 },
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template3', 'testimonials', index, field, value)}
              />

              <FieldGrid
                title="Template 3 Admissions"
                description="Template 3 admissions content is now separate from Template 1."
                data={content.template3 as Record<string, string>}
                fields={templateAdmissionsFields}
                onChange={(key, value) => updateTemplateField('template3', key, value)}
              />
            </TabsContent>

            <TabsContent value="template4" className="space-y-6">
              <FieldGrid
                title="Template 4 Top Header"
                description="Contact and address details shown in the colorful top header bar."
                data={content.template4 as Record<string, string>}
                fields={templateFourTopFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <FieldGrid
                title="Template 4 Hero and Notice"
                description="Classic hero section and visible principal notice content."
                data={content.template4 as Record<string, string>}
                fields={templateFourHeroFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <ArrayEditor
                title="Template 4 Highlights"
                description="Top classic stat cards shown below the hero."
                items={(content.template4.highlights as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'value', label: 'Value' },
                  { key: 'label', label: 'Label' },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template4', 'highlights', index, field, value)}
              />

              <FieldGrid
                title="Template 4 About"
                description="About section headline and intro for the classic school layout."
                data={content.template4 as Record<string, string>}
                fields={templateFourAboutFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <ArrayEditor
                title="Template 4 About Cards"
                description="Small classic cards that explain the school identity."
                items={(content.template4.templateFourAboutCards as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template4', 'templateFourAboutCards', index, field, value)}
              />

              <FieldGrid
                title="Template 4 Gallery"
                description="Gallery section heading and intro copy."
                data={content.template4 as Record<string, string>}
                fields={templateFourGalleryFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <ArrayEditor
                title="Template 4 Gallery Items"
                description="Gallery cards for campus, classrooms, celebrations, and sports."
                items={(content.template4.templateFourGalleryItems as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'category', label: 'Category' },
                  { key: 'title', label: 'Title' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template4', 'templateFourGalleryItems', index, field, value)}
              />

              <FieldGrid
                title="Template 4 Events"
                description="Events board heading and section intro."
                data={content.template4 as Record<string, string>}
                fields={templateFourEventsFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <ArrayEditor
                title="Template 4 Events List"
                description="Classic events and updates for parents and students."
                items={(content.template4.templateFourEvents as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'detail', label: 'Detail', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template4', 'templateFourEvents', index, field, value)}
              />

              <FieldGrid
                title="Template 4 Admissions"
                description="Admissions CTA copy and link labels for Template 4."
                data={content.template4 as Record<string, string>}
                fields={templateAdmissionsFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <FieldGrid
                title="Template 4 Contact"
                description="Contact section heading and descriptive copy."
                data={content.template4 as Record<string, string>}
                fields={templateFourContactFields}
                onChange={(key, value) => updateTemplateField('template4', key, value)}
              />

              <ArrayEditor
                title="Template 4 Contact Items"
                description="School office, admissions desk, and campus address cards."
                items={(content.template4.templateFourContactItems as Array<Record<string, string>>) ?? []}
                fields={[
                  { key: 'title', label: 'Title' },
                  { key: 'value', label: 'Value' },
                  { key: 'description', label: 'Description', rows: 3 },
                ]}
                onChange={(index, field, value) => updateTemplateArrayItem('template4', 'templateFourContactItems', index, field, value)}
              />
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
                <TemplatePreviewCard
                  label={templateOptions[0].label}
                  description={templateOptions[0].description}
                  content={{ ...templateOnePreview, activeTemplate: 'template1' }}
                />
                <TemplatePreviewCard
                  label={templateOptions[1].label}
                  description={templateOptions[1].description}
                  content={{ ...templateTwoPreview, activeTemplate: 'template2' }}
                />
                <TemplatePreviewCard
                  label={templateOptions[2].label}
                  description={templateOptions[2].description}
                  content={{ ...templateThreePreview, activeTemplate: 'template3' }}
                />
                <TemplatePreviewCard
                  label={templateOptions[3].label}
                  description={templateOptions[3].description}
                  content={{ ...templateFourPreview, activeTemplate: 'template4' }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </DashboardLayout>
  );
}
