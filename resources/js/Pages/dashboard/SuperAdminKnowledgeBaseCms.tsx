import { useLanguage } from '../../i18n/LanguageProvider';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpenText, FilePenLine, HelpCircle, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

type KnowledgeBaseEntry = {
    id: string;
    question: string;
    answer: string;
};

type KnowledgeBaseModule = {
    id: string;
    title: string;
    summary: string;
    content: string;
};

type KnowledgeBaseContent = {
    title: string;
    subtitle: string;
    search_placeholder: string;
    documentation_title: string;
    documentation_subtitle: string;
    faq_title: string;
    faq_subtitle: string;
    modules: KnowledgeBaseModule[];
    faqs: KnowledgeBaseEntry[];
};

type CmsSection = 'modules' | 'faq';
type FormatAction = 'h1' | 'h2' | 'p' | 'strong' | 'em' | 'ul' | 'ol' | 'blockquote';

const stripHtml = (value: string) =>
    value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
const htmlDocumentClass = [
    'kb-document mt-4 max-w-none text-sm leading-7 text-slate-700 sm:text-base',
    '[&_article]:space-y-4',
    '[&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-slate-950',
    '[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-slate-900',
    '[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900',
    '[&_p]:my-3',
    '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6',
    '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6',
    '[&_li]:pl-1',
    '[&_strong]:font-semibold [&_strong]:text-slate-950',
    '[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-sky-200 [&_blockquote]:bg-sky-50 [&_blockquote]:py-3 [&_blockquote]:pl-4 [&_blockquote]:text-slate-700',
].join(' ');

const createEmptyEntry = (): KnowledgeBaseEntry => ({
    id: `kb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    question: '',
    answer: '',
});

const createEmptyModule = (): KnowledgeBaseModule => ({
    id: `module_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    summary: '',
    content: '',
});

export default function SuperAdminKnowledgeBaseCms({
    knowledgeBaseContent,
}: {
    knowledgeBaseContent: KnowledgeBaseContent;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const errors = (usePage().props as any).errors ?? {};
    const [formData, setFormData] = useState<KnowledgeBaseContent>(knowledgeBaseContent);
    const [activeSection, setActiveSection] = useState<CmsSection>('modules');
    const [selectedModuleId, setSelectedModuleId] = useState(knowledgeBaseContent.modules[0]?.id ?? '');
    const [selectedFaqId, setSelectedFaqId] = useState(knowledgeBaseContent.faqs[0]?.id ?? '');
    const [pageModalOpen, setPageModalOpen] = useState(false);
    const [moduleModalOpen, setModuleModalOpen] = useState(false);
    const [faqModalOpen, setFaqModalOpen] = useState(false);
    const [moduleDraft, setModuleDraft] = useState<KnowledgeBaseModule>(createEmptyModule());
    const [faqDraft, setFaqDraft] = useState<KnowledgeBaseEntry>(createEmptyEntry());
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
    const moduleContentRef = useRef<HTMLTextAreaElement | null>(null);
    const faqAnswerRef = useRef<HTMLTextAreaElement | null>(null);
    const [pageDraft, setPageDraft] = useState({
        title: knowledgeBaseContent.title,
        subtitle: knowledgeBaseContent.subtitle,
        search_placeholder: knowledgeBaseContent.search_placeholder,
        documentation_title: knowledgeBaseContent.documentation_title,
        documentation_subtitle: knowledgeBaseContent.documentation_subtitle,
        faq_title: knowledgeBaseContent.faq_title,
        faq_subtitle: knowledgeBaseContent.faq_subtitle,
    });

    useEffect(() => {
        setFormData(knowledgeBaseContent);
        setSelectedModuleId(knowledgeBaseContent.modules[0]?.id ?? '');
        setSelectedFaqId(knowledgeBaseContent.faqs[0]?.id ?? '');
        setPageDraft({
            title: knowledgeBaseContent.title,
            subtitle: knowledgeBaseContent.subtitle,
            search_placeholder: knowledgeBaseContent.search_placeholder,
            documentation_title: knowledgeBaseContent.documentation_title,
            documentation_subtitle: knowledgeBaseContent.documentation_subtitle,
            faq_title: knowledgeBaseContent.faq_title,
            faq_subtitle: knowledgeBaseContent.faq_subtitle,
        });
    }, [knowledgeBaseContent]);

    const selectedModule = useMemo(
        () => formData.modules.find((module) => module.id === selectedModuleId) ?? formData.modules[0] ?? null,
        [formData.modules, selectedModuleId],
    );

    const selectedFaq = useMemo(
        () => formData.faqs.find((faq) => faq.id === selectedFaqId) ?? formData.faqs[0] ?? null,
        [formData.faqs, selectedFaqId],
    );

    const openPageModal = () => {
        setPageDraft({
            title: formData.title,
            subtitle: formData.subtitle,
            search_placeholder: formData.search_placeholder,
            documentation_title: formData.documentation_title,
            documentation_subtitle: formData.documentation_subtitle,
            faq_title: formData.faq_title,
            faq_subtitle: formData.faq_subtitle,
        });
        setPageModalOpen(true);
    };

    const openAddModuleModal = () => {
        setEditingModuleId(null);
        setModuleDraft(createEmptyModule());
        setModuleModalOpen(true);
    };

    const openEditModuleModal = () => {
        if (!selectedModule) return;
        setEditingModuleId(selectedModule.id);
        setModuleDraft(selectedModule);
        setModuleModalOpen(true);
    };

    const openAddFaqModal = () => {
        setEditingFaqId(null);
        setFaqDraft(createEmptyEntry());
        setFaqModalOpen(true);
    };

    const openEditFaqModal = () => {
        if (!selectedFaq) return;
        setEditingFaqId(selectedFaq.id);
        setFaqDraft(selectedFaq);
        setFaqModalOpen(true);
    };

    const savePageDraft = () => {
        setFormData((current) => ({
            ...current,
            ...pageDraft,
        }));
        setPageModalOpen(false);
    };

    const saveModuleDraft = () => {
        if (!moduleDraft.title.trim() || !moduleDraft.content.trim()) {
            return;
        }

        setFormData((current) => {
            const modules = editingModuleId
                ? current.modules.map((module) => (module.id === editingModuleId ? moduleDraft : module))
                : [...current.modules, moduleDraft];

            return { ...current, modules };
        });

        setSelectedModuleId(moduleDraft.id);
        setModuleModalOpen(false);
    };

    const saveFaqDraft = () => {
        if (!faqDraft.question.trim() || !faqDraft.answer.trim()) {
            return;
        }

        setFormData((current) => {
            const faqs = editingFaqId
                ? current.faqs.map((faq) => (faq.id === editingFaqId ? faqDraft : faq))
                : [...current.faqs, faqDraft];

            return { ...current, faqs };
        });

        setSelectedFaqId(faqDraft.id);
        setFaqModalOpen(false);
    };

    const deleteSelectedModule = () => {
        if (!selectedModule || formData.modules.length <= 1) return;

        const remainingModules = formData.modules.filter((module) => module.id !== selectedModule.id);
        setFormData((current) => ({ ...current, modules: remainingModules }));
        setSelectedModuleId(remainingModules[0]?.id ?? '');
    };

    const deleteSelectedFaq = () => {
        if (!selectedFaq || formData.faqs.length <= 1) return;

        const remainingFaqs = formData.faqs.filter((faq) => faq.id !== selectedFaq.id);
        setFormData((current) => ({ ...current, faqs: remainingFaqs }));
        setSelectedFaqId(remainingFaqs[0]?.id ?? '');
    };

    const wrapSelection = (
        ref: React.RefObject<HTMLTextAreaElement | null>,
        currentValue: string,
        onChange: (value: string) => void,
        action: FormatAction,
    ) => {
        const textarea = ref.current;
        if (!textarea) return;

        const selectionStart = textarea.selectionStart ?? 0;
        const selectionEnd = textarea.selectionEnd ?? 0;
        const selectedText = currentValue.slice(selectionStart, selectionEnd);
        const replacement = buildFormattedBlock(action, selectedText);
        const nextValue = `${currentValue.slice(0, selectionStart)}${replacement}${currentValue.slice(selectionEnd)}`;

        onChange(nextValue);

        requestAnimationFrame(() => {
            const nextStart = selectionStart;
            const nextEnd = selectionStart + replacement.length;
            textarea.focus();
            textarea.setSelectionRange(nextStart, nextEnd);
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.visit('/dashboard')}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">{t('Knowledge Base CMS')}</h1>
                        <p className="mt-1 text-gray-600">
                            {t('Preview module documentation and FAQs, then edit them in focused modals.')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={openPageModal}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        {t('Edit Page Content')}
                    </Button>
                    <form
                        onSubmit={(event: FormEvent<HTMLFormElement>) => {
                            event.preventDefault();
                            router.patch('/superadmin/knowledge-base-cms', formData, {
                                preserveScroll: true,
                            });
                        }}
                    >
                        <Button type="submit">
                            <Save className="mr-2 h-4 w-4" />
                            {t('Save Changes')}
                        </Button>
                    </form>
                </div>
            </div>

            {flash.success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {flash.success}
                </div>
            )}

            {flash.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{flash.error}</div>
            )}

            {Object.keys(errors).length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {Object.values(errors)[0] as string}
                </div>
            )}

            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                    <div className="space-y-6">
                        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <Badge className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                                        {t('Page Preview')}
                                    </Badge>
                                    <h2 className="mt-4 text-3xl font-bold text-slate-900">{t(formData.title)}</h2>
                                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                                        {formData.subtitle}
                                    </p>
                                </div>
                                <Button type="button" variant="outline" onClick={openPageModal}>
                                    <FilePenLine className="mr-2 h-4 w-4" />
                                    {t('Edit')}
                                </Button>
                            </div>
                        </section>

                        <Tabs
                            value={activeSection}
                            onValueChange={(value) => setActiveSection(value as CmsSection)}
                            className="space-y-6"
                        >
                            <TabsList className="h-auto rounded-2xl bg-slate-100 p-1">
                                <TabsTrigger
                                    value="modules"
                                    className="gap-2 rounded-2xl px-5 py-3 data-[state=active]:bg-white data-[state=active]:text-sky-700"
                                >
                                    <BookOpenText className="h-4 w-4" />
                                    {t('Modules')}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="faq"
                                    className="gap-2 rounded-2xl px-5 py-3 data-[state=active]:bg-white data-[state=active]:text-emerald-700"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                    {t('FAQ')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="modules" className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">
                                            {formData.documentation_title}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">{formData.documentation_subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={openEditModuleModal}
                                            disabled={!selectedModule}
                                        >
                                            <FilePenLine className="mr-2 h-4 w-4" />
                                            {t('Edit Module')}
                                        </Button>
                                        <Button type="button" onClick={openAddModuleModal}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Add Module')}
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                                    <aside className="space-y-2">
                                        {formData.modules.map((module) => {
                                            const isActive = module.id === selectedModule?.id;

                                            return (
                                                <button
                                                    key={module.id}
                                                    type="button"
                                                    onClick={() => setSelectedModuleId(module.id)}
                                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                                        isActive
                                                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <p className="font-semibold">{t(module.title)}</p>
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                        {module.summary || stripHtml(module.content)}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </aside>

                                    <main>
                                        {selectedModule ? (
                                            <Card className="rounded-3xl border-slate-200 shadow-none">
                                                <CardContent className="p-6 sm:p-8">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <Badge className="border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50">
                                                                {t('Documentation')}
                                                            </Badge>
                                                            <h4 className="mt-4 text-2xl font-bold text-slate-900">
                                                                {t(selectedModule.title)}
                                                            </h4>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={deleteSelectedModule}
                                                            disabled={formData.modules.length <= 1}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('Delete')}
                                                        </Button>
                                                    </div>
                                                    {selectedModule.summary ? (
                                                        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                                                            {selectedModule.summary}
                                                        </p>
                                                    ) : null}
                                                    <div
                                                        className={htmlDocumentClass}
                                                        dangerouslySetInnerHTML={{
                                                            __html: selectedModule.content,
                                                        }}
                                                    />
                                                </CardContent>
                                            </Card>
                                        ) : null}
                                    </main>
                                </div>
                            </TabsContent>

                            <TabsContent value="faq" className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">{formData.faq_title}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{formData.faq_subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={openEditFaqModal}
                                            disabled={!selectedFaq}
                                        >
                                            <FilePenLine className="mr-2 h-4 w-4" />
                                            {t('Edit FAQ')}
                                        </Button>
                                        <Button type="button" onClick={openAddFaqModal}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Add FAQ')}
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                                    <aside className="space-y-2">
                                        {formData.faqs.map((faq) => {
                                            const isActive = faq.id === selectedFaq?.id;

                                            return (
                                                <button
                                                    key={faq.id}
                                                    type="button"
                                                    onClick={() => setSelectedFaqId(faq.id)}
                                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                                        isActive
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <p className="font-semibold">{faq.question}</p>
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                        {stripHtml(faq.answer)}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </aside>

                                    <main>
                                        {selectedFaq ? (
                                            <Card className="rounded-3xl border-slate-200 shadow-none">
                                                <CardContent className="p-6 sm:p-8">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                                                {t('FAQ')}
                                                            </Badge>
                                                            <h4 className="mt-4 text-2xl font-bold text-slate-900">
                                                                {selectedFaq.question}
                                                            </h4>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={deleteSelectedFaq}
                                                            disabled={formData.faqs.length <= 1}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('Delete')}
                                                        </Button>
                                                    </div>
                                                    <div
                                                        className={htmlDocumentClass}
                                                        dangerouslySetInnerHTML={{
                                                            __html: selectedFaq.answer,
                                                        }}
                                                    />
                                                </CardContent>
                                            </Card>
                                        ) : null}
                                    </main>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={pageModalOpen} onOpenChange={setPageModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Page Content')}</DialogTitle>
                        <DialogDescription>
                            {t('Update the shared knowledge base headings and labels.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label={t('Page Title')}>
                            <input
                                type="text"
                                value={pageDraft.title}
                                onChange={(event) =>
                                    setPageDraft((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <Field label={t('Search Placeholder')}>
                            <input
                                type="text"
                                value={pageDraft.search_placeholder}
                                onChange={(event) =>
                                    setPageDraft((current) => ({
                                        ...current,
                                        search_placeholder: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <div className="md:col-span-2">
                            <Field label={t('Subtitle')}>
                                <textarea
                                    rows={3}
                                    value={pageDraft.subtitle}
                                    onChange={(event) =>
                                        setPageDraft((current) => ({
                                            ...current,
                                            subtitle: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                />
                            </Field>
                        </div>
                        <Field label={t('Documentation Title')}>
                            <input
                                type="text"
                                value={pageDraft.documentation_title}
                                onChange={(event) =>
                                    setPageDraft((current) => ({
                                        ...current,
                                        documentation_title: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <Field label={t('FAQ Title')}>
                            <input
                                type="text"
                                value={pageDraft.faq_title}
                                onChange={(event) =>
                                    setPageDraft((current) => ({
                                        ...current,
                                        faq_title: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <div className="md:col-span-2">
                            <Field label={t('Documentation Subtitle')}>
                                <textarea
                                    rows={2}
                                    value={pageDraft.documentation_subtitle}
                                    onChange={(event) =>
                                        setPageDraft((current) => ({
                                            ...current,
                                            documentation_subtitle: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                            <Field label={t('FAQ Subtitle')}>
                                <textarea
                                    rows={2}
                                    value={pageDraft.faq_subtitle}
                                    onChange={(event) =>
                                        setPageDraft((current) => ({
                                            ...current,
                                            faq_subtitle: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                />
                            </Field>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPageModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={savePageDraft}>
                            {t('Apply Changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingModuleId ? t('Edit Module') : t('Add Module')}</DialogTitle>
                        <DialogDescription>{t('Update the selected documentation preview.')}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Field label={t('Module Title')}>
                            <input
                                type="text"
                                value={moduleDraft.title}
                                onChange={(event) =>
                                    setModuleDraft((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <Field label={t('Short Summary')}>
                            <textarea
                                rows={2}
                                value={moduleDraft.summary}
                                onChange={(event) =>
                                    setModuleDraft((current) => ({
                                        ...current,
                                        summary: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <Field label={t('Documentation Content (HTML)')}>
                            <DocumentToolbar
                                onFormat={(action) =>
                                    wrapSelection(
                                        moduleContentRef,
                                        moduleDraft.content,
                                        (value) =>
                                            setModuleDraft((current) => ({
                                                ...current,
                                                content: value,
                                            })),
                                        action,
                                    )
                                }
                            />

                            <textarea
                                ref={moduleContentRef}
                                rows={12}
                                value={moduleDraft.content}
                                onChange={(event) =>
                                    setModuleDraft((current) => ({
                                        ...current,
                                        content: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                            />

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {t('Live Preview')}
                                </p>
                                <div
                                    className={htmlDocumentClass}
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            moduleDraft.content ||
                                            `<p>${t('Formatted module documentation preview will appear here.')}</p>`,
                                    }}
                                />
                            </div>
                        </Field>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModuleModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={saveModuleDraft}>
                            {t('Save Module')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={faqModalOpen} onOpenChange={setFaqModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingFaqId ? t('Edit FAQ') : t('Add FAQ')}</DialogTitle>
                        <DialogDescription>{t('Update the selected FAQ preview.')}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Field label={t('Question')}>
                            <input
                                type="text"
                                value={faqDraft.question}
                                onChange={(event) =>
                                    setFaqDraft((current) => ({
                                        ...current,
                                        question: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                        </Field>
                        <Field label={t('Answer (HTML)')}>
                            <DocumentToolbar
                                onFormat={(action) =>
                                    wrapSelection(
                                        faqAnswerRef,
                                        faqDraft.answer,
                                        (value) =>
                                            setFaqDraft((current) => ({
                                                ...current,
                                                answer: value,
                                            })),
                                        action,
                                    )
                                }
                            />

                            <textarea
                                ref={faqAnswerRef}
                                rows={10}
                                value={faqDraft.answer}
                                onChange={(event) =>
                                    setFaqDraft((current) => ({
                                        ...current,
                                        answer: event.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                            />

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {t('Live Preview')}
                                </p>
                                <div
                                    className={htmlDocumentClass}
                                    dangerouslySetInnerHTML={{
                                        __html: faqDraft.answer || `<p>${t('Formatted FAQ preview will appear here.')}</p>`,
                                    }}
                                />
                            </div>
                        </Field>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setFaqModalOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={saveFaqDraft}>
                            {t('Save FAQ')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}

function DocumentToolbar({ onFormat }: { onFormat: (action: FormatAction) => void }) {
    const { t } = useLanguage();
    const actions: Array<{ action: FormatAction; label: string }> = [
        { action: 'h1', label: 'H1' },
        { action: 'h2', label: 'H2' },
        { action: 'p', label: 'P' },
        { action: 'strong', label: 'Bold' },
        { action: 'em', label: 'Italic' },
        { action: 'ul', label: 'Bullet List' },
        { action: 'ol', label: 'Numbered List' },
        { action: 'blockquote', label: 'Callout' },
    ];

    return (
        <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
            {actions.map((item) => (
                <Button
                    key={item.action}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onFormat(item.action)}
                >
                    {t(item.label)}
                </Button>
            ))}
        </div>
    );
}

function buildFormattedBlock(action: FormatAction, selection: string): string {
    const trimmed = selection.trim();

    switch (action) {
        case 'h1':
            return `<h1>${trimmed || 'Heading'}</h1>`;
        case 'h2':
            return `<h2>${trimmed || 'Section Title'}</h2>`;
        case 'p':
            return `<p>${trimmed || 'Paragraph text.'}</p>`;
        case 'strong':
            return `<strong>${trimmed || 'Important text'}</strong>`;
        case 'em':
            return `<em>${trimmed || 'Emphasized text'}</em>`;
        case 'ul':
            return buildListBlock('ul', trimmed);
        case 'ol':
            return buildListBlock('ol', trimmed);
        case 'blockquote':
            return `<blockquote><p>${trimmed || 'Important note or operational reminder.'}</p></blockquote>`;
        default:
            return selection;
    }
}

function buildListBlock(tag: 'ul' | 'ol', selection: string): string {
    const items = selection
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

    const listItems = (items.length > 0 ? items : ['List item']).map((item) => `<li>${item}</li>`).join('');

    return `<${tag}>${listItems}</${tag}>`;
}
