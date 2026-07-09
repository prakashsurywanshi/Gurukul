import { useMemo, useState } from 'react';
import { BookOpenText, FileText, HelpCircle, Search, Sparkles } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type KnowledgeBaseModule = {
  id: string;
  title: string;
  summary: string;
  content: string;
};

type KnowledgeBaseFaq = {
  id: string;
  question: string;
  answer: string;
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

type SearchResult =
  | {
      id: string;
      type: 'module';
      title: string;
      preview: string;
      module: KnowledgeBaseModule;
    }
  | {
      id: string;
      type: 'faq';
      title: string;
      preview: string;
      faq: KnowledgeBaseFaq;
    };

interface KnowledgeBaseProps {
  user: any;
  knowledgeBaseContent: {
    title: string;
    subtitle: string;
    search_placeholder: string;
    documentation_title: string;
    documentation_subtitle: string;
    faq_title: string;
    faq_subtitle: string;
    modules: KnowledgeBaseModule[];
    faqs: KnowledgeBaseFaq[];
  };
}

const normalize = (value: string) => stripHtml(value).trim().toLowerCase();

export default function KnowledgeBase({ user, knowledgeBaseContent }: KnowledgeBaseProps) {
  const modules = knowledgeBaseContent.modules ?? [];
  const faqs = knowledgeBaseContent.faqs ?? [];
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'modules' | 'faq'>('modules');
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id ?? '');
  const [selectedFaqId, setSelectedFaqId] = useState(faqs[0]?.id ?? '');

  const searchResults = useMemo<SearchResult[]>(() => {
    const term = normalize(query);

    const moduleResults = modules.map((module) => ({
      id: module.id,
      type: 'module' as const,
      title: module.title,
      preview: module.summary || stripHtml(module.content),
      module,
    }));

    const faqResults = faqs.map((faq) => ({
      id: faq.id,
      type: 'faq' as const,
      title: faq.question,
      preview: stripHtml(faq.answer),
      faq,
    }));

    const combined = [...moduleResults, ...faqResults];

    if (!term) {
      return combined;
    }

    return combined.filter((item) => {
      const haystack = `${item.title} ${item.preview}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [faqs, modules, query]);

  const filteredModules = useMemo(() => {
    const allowedIds = new Set(searchResults.filter((item) => item.type === 'module').map((item) => item.id));
    return query ? modules.filter((module) => allowedIds.has(module.id)) : modules;
  }, [modules, query, searchResults]);

  const filteredFaqs = useMemo(() => {
    const allowedIds = new Set(searchResults.filter((item) => item.type === 'faq').map((item) => item.id));
    return query ? faqs.filter((faq) => allowedIds.has(faq.id)) : faqs;
  }, [faqs, query, searchResults]);

  const suggestions = useMemo(() => searchResults.slice(0, 6), [searchResults]);

  const selectedModule = filteredModules.find((module) => module.id === selectedModuleId) ?? filteredModules[0] ?? null;
  const selectedFaq = filteredFaqs.find((faq) => faq.id === selectedFaqId) ?? filteredFaqs[0] ?? null;

  return (
    <DashboardLayout user={user} activeTab="knowledge-base">
      <div className="min-h-full bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:p-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">Knowledge Base</Badge>
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Documentation + FAQ</Badge>
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {knowledgeBaseContent.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  {knowledgeBaseContent.subtitle}
                </p>

                <div className="relative mt-6">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={knowledgeBaseContent.search_placeholder}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                  />

                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      {suggestions.map((item) => (
                        <button
                          key={`${item.type}_${item.id}`}
                          type="button"
                          onClick={() => {
                            setQuery(item.title);

                            if (item.type === 'module') {
                              setActiveSection('modules');
                              setSelectedModuleId(item.id);
                            } else {
                              setActiveSection('faq');
                              setSelectedFaqId(item.id);
                            }
                          }}
                          className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {item.type === 'module' ? <FileText className="h-3.5 w-3.5" /> : <HelpCircle className="h-3.5 w-3.5" />}
                            {item.type === 'module' ? 'Documentation' : 'FAQ'}
                          </div>
                          <p className="mt-1 font-medium text-slate-900">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.preview}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Sparkles className="h-4 w-4" />
                  Quick help overview
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Documentation modules</p>
                    <p className="mt-2 text-2xl font-semibold">{modules.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">FAQ entries</p>
                    <p className="mt-2 text-2xl font-semibold">{faqs.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-100">
                    Search across both module documentation and FAQs, then open the matching item inside the right tab below.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as 'modules' | 'faq')} className="space-y-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <TabsList className="h-auto rounded-2xl bg-slate-100 p-1">
                  <TabsTrigger value="modules" className="gap-2 rounded-2xl px-5 py-3 data-[state=active]:bg-white data-[state=active]:text-sky-700">
                    <BookOpenText className="h-4 w-4" />
                    Modules
                  </TabsTrigger>
                  <TabsTrigger value="faq" className="gap-2 rounded-2xl px-5 py-3 data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                    <HelpCircle className="h-4 w-4" />
                    FAQ
                  </TabsTrigger>
                </TabsList>

                <Button type="button" variant="outline" onClick={() => setQuery('')} disabled={!query}>
                  Clear Search
                </Button>
              </div>

              <TabsContent value="modules" className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{knowledgeBaseContent.documentation_title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{knowledgeBaseContent.documentation_subtitle}</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="space-y-2">
                    {filteredModules.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No documentation modules match your search.</div>
                    ) : (
                      filteredModules.map((module) => {
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
                            <p className="font-semibold">{module.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{module.summary || stripHtml(module.content)}</p>
                          </button>
                        );
                      })
                    )}
                  </aside>

                  <main>
                    {selectedModule ? (
                      <Card className="rounded-3xl border-slate-200 shadow-none">
                        <CardContent className="p-6 sm:p-8">
                          <Badge className="border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50">Documentation</Badge>
                          <h3 className="mt-4 text-2xl font-bold text-slate-900">{selectedModule.title}</h3>
                          {selectedModule.summary ? (
                            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{selectedModule.summary}</p>
                          ) : null}
                          <div
                            className={htmlDocumentClass}
                            dangerouslySetInnerHTML={{ __html: selectedModule.content }}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="rounded-3xl border-slate-200 shadow-none">
                        <CardContent className="p-6 text-sm text-slate-500">No documentation modules are available yet.</CardContent>
                      </Card>
                    )}
                  </main>
                </div>
              </TabsContent>

              <TabsContent value="faq" className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{knowledgeBaseContent.faq_title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{knowledgeBaseContent.faq_subtitle}</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="space-y-2">
                    {filteredFaqs.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No FAQ results match your search.</div>
                    ) : (
                      filteredFaqs.map((faq) => {
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
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{stripHtml(faq.answer)}</p>
                          </button>
                        );
                      })
                    )}
                  </aside>

                  <main>
                    {selectedFaq ? (
                      <Card className="rounded-3xl border-slate-200 shadow-none">
                        <CardContent className="p-6 sm:p-8">
                          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">FAQ</Badge>
                          <h3 className="mt-4 text-2xl font-bold text-slate-900">{selectedFaq.question}</h3>
                          <div
                            className={htmlDocumentClass}
                            dangerouslySetInnerHTML={{ __html: selectedFaq.answer }}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="rounded-3xl border-slate-200 shadow-none">
                        <CardContent className="p-6 text-sm text-slate-500">No FAQ entries are available yet.</CardContent>
                      </Card>
                    )}
                  </main>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
