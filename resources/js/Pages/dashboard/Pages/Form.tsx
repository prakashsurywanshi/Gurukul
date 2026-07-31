import { useCallback, useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  ChevronLeft, Save, Eye, Image as ImageIcon, Plus, X, Upload, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import ImageUpload from '../../../components/website/ImageUpload';
import RichTextEditor from '../../../components/RichTextEditor';

interface GalleryItem {
  title: string;
  description: string;
  image: string;
  category: string;
}

interface PageData {
  id: number;
  title: string;
  slug: string;
  content: string | { sections?: Array<{ id: string; type: string; data: Record<string, any> }> } | null;
  meta_title: string | null;
  meta_keywords: string | null;
  meta_description: string | null;
  featured_image: string | null;
  banner_image: string | null;
  short_description: string | null;
  status: string;
  show_in_menu: boolean;
  menu_order: number;
}

interface PageFormProps {
  user: any;
  page: PageData | null;
  organization: any;
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

function detectContentType(content: PageData['content']): 'richtext' | 'gallery' {
  if (content && typeof content === 'object' && Array.isArray(content.sections)) {
    return 'gallery';
  }
  return 'richtext';
}

function extractGalleryFromContent(content: PageData['content']): { title: string; description: string; items: GalleryItem[] } {
  if (content && typeof content === 'object' && Array.isArray(content.sections)) {
    const gallerySection = content.sections.find((s) => s.type === 'image-gallery');
    if (gallerySection) {
      const items: GalleryItem[] = (gallerySection.data.items || []).map((item: any) => ({
        title: item.title || '',
        description: item.description || '',
        image: item.image || '',
        category: item.category || '',
      }));
      return {
        title: gallerySection.data.title || '',
        description: gallerySection.data.description || '',
        items,
      };
    }
  }
  return { title: '', description: '', items: [{ title: '', description: '', image: '', category: '' }] };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function PageForm({ user, page, organization }: PageFormProps) {
  const { flash } = usePage().props as any;
  const isEditing = !!page;

  const [title, setTitle] = useState(page?.title || '');
  const [slug, setSlug] = useState(page?.slug || '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!page);
  const [content, setContent] = useState(typeof page?.content === 'string' ? page.content : '');
  const [metaTitle, setMetaTitle] = useState(page?.meta_title || '');
  const [metaKeywords, setMetaKeywords] = useState(page?.meta_keywords || '');
  const [metaDescription, setMetaDescription] = useState(page?.meta_description || '');
  const [featuredImage, setFeaturedImage] = useState(page?.featured_image || '');
  const [bannerImage, setBannerImage] = useState(page?.banner_image || '');
  const [shortDescription, setShortDescription] = useState(page?.short_description || '');
  const [status, setStatus] = useState(page?.status || 'draft');
  const [showInMenu, setShowInMenu] = useState(page?.show_in_menu || false);
  const [menuOrder, setMenuOrder] = useState(page?.menu_order || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const initialGallery = extractGalleryFromContent(page?.content);
  const [contentType, setContentType] = useState<'richtext' | 'gallery'>(() => detectContentType(page?.content));
  const [galleryTitle, setGalleryTitle] = useState(initialGallery.title);
  const [galleryDescription, setGalleryDescription] = useState(initialGallery.description);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(initialGallery.items);

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  };

  const handleContentTypeChange = (type: 'richtext' | 'gallery') => {
    if (type === contentType) return;
    if (contentType === 'gallery' && galleryItems.some((item) => item.image)) {
      if (!window.confirm('Switching to Rich Text will discard your gallery images. Continue?')) {
        return;
      }
    }
    setContentType(type);
  };

  const addGalleryItem = () => {
    setGalleryItems([...galleryItems, { title: '', description: '', image: '', category: '' }]);
  };

  const removeGalleryItem = (index: number) => {
    setGalleryItems(galleryItems.filter((_, i) => i !== index));
  };

  const updateGalleryItem = (index: number, field: keyof GalleryItem, value: string) => {
    const updated = [...galleryItems];
    updated[index] = { ...updated[index], [field]: value };
    setGalleryItems(updated);
  };

  const uploadGalleryImage = useCallback(async (index: number, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('folder', 'pages/gallery');
    try {
      const response = await fetch('/upload/image', {
        method: 'POST',
        body: fd,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': decodeURIComponent(
            document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
          ),
        },
      });
      const data = await response.json();
      if (data.url) {
        updateGalleryItem(index, 'image', data.url);
      } else {
        alert('Upload failed');
      }
    } catch {
      alert('Upload failed. Please try again.');
    }
  }, [galleryItems]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Page title is required.');
      return;
    }

    if (contentType === 'gallery' && galleryItems.every((item) => !item.image)) {
      toast.error('Please upload at least one image for the gallery.');
      return;
    }

    setIsSaving(true);

    let contentPayload: string | { sections: Array<{ id: string; type: string; data: Record<string, any> }> };

    if (contentType === 'gallery') {
      contentPayload = {
        sections: [
          {
            id: generateId(),
            type: 'image-gallery',
            data: {
              title: galleryTitle,
              description: galleryDescription,
              items: galleryItems.filter((item) => item.image),
            },
          },
        ],
      };
    } else {
      contentPayload = content;
    }

    const payload = {
      title,
      slug,
      content: contentPayload,
      meta_title: metaTitle || null,
      meta_keywords: metaKeywords || null,
      meta_description: metaDescription || null,
      featured_image: featuredImage || null,
      banner_image: bannerImage || null,
      short_description: shortDescription || null,
      status,
      show_in_menu: showInMenu,
      menu_order: menuOrder,
    };

    const options = {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(isEditing ? 'Page updated successfully.' : 'Page created successfully.');
        router.visit('/pages-builder');
      },
      onFinish: () => setIsSaving(false),
    };

    if (isEditing) {
      router.patch(`/pages-builder/${page.id}`, payload, options);
    } else {
      router.post('/pages-builder', payload, options);
    }
  };

  return (
    <DashboardLayout user={user} activeTab="pages-builder">
      <div className="space-y-6 p-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.visit('/pages-builder')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? `Edit: ${page.title}` : 'Create New Page'}
          </h1>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {/* Left Column - Settings */}
          <div className="space-y-4 xl:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Page Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Page Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. About Us"
                    required
                  />
                </div>

                <div>
                  <Label>URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">/</span>
                    <Input
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="about-us"
                      required
                    />
                  </div>
                  {slug && (
                    <p className="mt-1 text-xs text-slate-400">
                      Preview: /{slug}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Featured Image</Label>
                  <ImageUpload
                    value={featuredImage}
                    onChange={setFeaturedImage}
                    onRemove={() => setFeaturedImage('')}
                    folder="pages/featured"
                  />
                </div>

                <div>
                  <Label>Banner Image</Label>
                  <ImageUpload
                    value={bannerImage}
                    onChange={setBannerImage}
                    onRemove={() => setBannerImage('')}
                    folder="pages/banner"
                  />
                </div>

                <div>
                  <Label>Short Description</Label>
                  <Textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief description for SEO and page previews"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={status === 'published'}
                      onCheckedChange={(checked) => setStatus(checked ? 'published' : 'draft')}
                    />
                    <Label className="cursor-pointer">
                      {status === 'published' ? 'Published' : 'Draft'}
                    </Label>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showInMenu}
                      onCheckedChange={setShowInMenu}
                    />
                    <Label className="cursor-pointer">Show in Navigation</Label>
                  </div>
                </div>

                {showInMenu && (
                  <div>
                    <Label>Menu Order</Label>
                    <Input
                      type="number"
                      value={menuOrder}
                      onChange={(e) => setMenuOrder(parseInt(e.target.value, 10) || 0)}
                      className="w-24"
                      min={0}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">SEO Settings</CardTitle>
                <CardDescription>Optimize for search engines.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Meta Title</Label>
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Title for search engines"
                  />
                </div>

                <div>
                  <Label>Meta Keywords</Label>
                  <Input
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Description for search engines (150-160 chars recommended)"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-4 xl:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Page Content</CardTitle>
                    <CardDescription>
                      Choose content type and build your page.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content Type Toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('richtext')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                      contentType === 'richtext'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Rich Text
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('gallery')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                      contentType === 'gallery'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ImageIcon className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                    Gallery
                  </button>
                </div>

                {/* Rich Text Mode */}
                {contentType === 'richtext' && (
                  <>
                    {showPreview ? (
                      <div className="min-h-[400px] rounded-lg border border-slate-200 bg-white p-6">
                        {bannerImage && (
                          <div className="mb-6 aspect-[21/9] w-full overflow-hidden rounded-lg">
                            <img src={bannerImage} alt={title} className="h-full w-full object-cover" />
                          </div>
                        )}
                        {featuredImage && (
                          <div className="mb-6">
                            <img src={featuredImage} alt={title} className="w-full max-w-md rounded-lg" />
                          </div>
                        )}
                        <h1 className="mb-4 text-3xl font-bold text-slate-900">{title || 'Untitled Page'}</h1>
                        {shortDescription && (
                          <p className="mb-6 text-lg text-slate-600">{shortDescription}</p>
                        )}
                        <div
                          className="prose prose-slate max-w-none"
                          dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-400 italic">No content yet.</p>' }}
                        />
                      </div>
                    ) : (
                      <RichTextEditor
                        value={content}
                        onChange={setContent}
                        placeholder="Start writing your page content here..."
                      />
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {showPreview ? 'Edit' : 'Preview'}
                      </Button>
                    </div>
                  </>
                )}

                {/* Gallery Mode */}
                {contentType === 'gallery' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Gallery Title</Label>
                      <Input
                        value={galleryTitle}
                        onChange={(e) => setGalleryTitle(e.target.value)}
                        placeholder="e.g. Campus Gallery"
                      />
                    </div>
                    <div>
                      <Label>Gallery Description</Label>
                      <Textarea
                        rows={2}
                        value={galleryDescription}
                        onChange={(e) => setGalleryDescription(e.target.value)}
                        placeholder="Brief description for the gallery section"
                      />
                    </div>

                    <div className="space-y-6">
                      <Label>Albums</Label>
                      {(() => {
                        const albumMap: Record<string, number[]> = {};
                        galleryItems.forEach((_, idx) => {
                          const cat = galleryItems[idx].category || '';
                          if (!albumMap[cat]) albumMap[cat] = [];
                          albumMap[cat].push(idx);
                        });
                        const albumNames = Object.keys(albumMap);

                        return albumNames.map((albumName) => {
                          const indices = albumMap[albumName];
                          return (
                            <div key={`album-${indices[0]}`} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                                <input
                                  type="text"
                                  value={albumName}
                                  onChange={(e) => {
                                    const newName = e.target.value;
                                    const updated = [...galleryItems];
                                    indices.forEach((idx) => {
                                      updated[idx] = { ...updated[idx], category: newName };
                                    });
                                    setGalleryItems(updated);
                                  }}
                                  placeholder="Album name (e.g. Annual Day, Sports Day)"
                                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <span className="text-xs text-slate-400">{indices.length} image{indices.length !== 1 ? 's' : ''}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = galleryItems.filter((_, idx) => !indices.includes(idx));
                                    setGalleryItems(updated.length ? updated : [{ title: '', description: '', image: '', category: '' }]);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                  title="Remove album"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="p-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {indices.map((idx) => (
                                    <GalleryImageCard
                                      key={idx}
                                      item={galleryItems[idx]}
                                      index={idx}
                                      onUpload={uploadGalleryImage}
                                      onRemove={() => {
                                        const updated = galleryItems.filter((_, i) => i !== idx);
                                        setGalleryItems(updated.length ? updated : [{ title: '', description: '', image: '', category: '' }]);
                                      }}
                                      onUpdate={(field, value) => updateGalleryItem(idx, field, value)}
                                    />
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGalleryItems([...galleryItems, { title: '', description: '', image: '', category: albumName }]);
                                    }}
                                    className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-blue-300 hover:text-blue-500"
                                  >
                                    <Plus className="h-5 w-5" />
                                    <span className="text-xs font-medium">Add Image</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}

                      <button
                        type="button"
                        onClick={() => setGalleryItems([...galleryItems, { title: '', description: '', image: '', category: '' }])}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600"
                      >
                        <Plus className="h-4 w-4" />
                        Create New Album
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.visit('/pages-builder')}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : isEditing ? 'Update Page' : 'Create Page'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function GalleryImageCard({
  item,
  index,
  onUpload,
  onRemove,
  onUpdate,
}: {
  item: GalleryItem;
  index: number;
  onUpload: (index: number, file: File) => void;
  onRemove: () => void;
  onUpdate: (field: keyof GalleryItem, value: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    await onUpload(index, file);
    setIsUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="group/img relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative h-36 bg-slate-100">
        {item.image ? (
          <>
            <img src={item.image} alt={item.title || ''} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover/img:opacity-100">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-slate-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400 transition hover:text-blue-500"
          >
            {isUploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
                  <Upload className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium">Click to upload</span>
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="p-2.5">
        <Input
          value={item.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          placeholder="Image title"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}
