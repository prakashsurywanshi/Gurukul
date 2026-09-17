import { Head, Link, router } from '@inertiajs/react';
import { Briefcase, Building2, GraduationCap, Landmark, School, ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import LanguageSwitcher from '../components/LanguageSwitcher';

type GatewayOrganization = {
    id: number;
    name: string;
    slug: string;
    type: 'school' | 'college' | 'coaching' | 'university';
    city?: string | null;
    logo?: string | null;
};

export default function SelectOrganization({ organizations }: { organizations: GatewayOrganization[] }) {
    const { t } = useLanguage();

    const typeMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
        school: { label: t('Schools'), icon: School, accent: 'from-emerald-500 to-teal-600' },
        college: { label: t('Colleges'), icon: GraduationCap, accent: 'from-indigo-500 to-blue-600' },
        coaching: { label: t('Coaching Centers'), icon: Briefcase, accent: 'from-orange-500 to-amber-600' },
        university: { label: t('Universities'), icon: Landmark, accent: 'from-purple-500 to-fuchsia-600' },
    };

    const grouped = useMemo(() => {
        const order = ['school', 'college', 'coaching', 'university'];
        const map = new Map<string, GatewayOrganization[]>();
        order.forEach((type) => map.set(type, []));
        organizations.forEach((org) => {
            const list = map.get(org.type) ?? [];
            list.push(org);
            map.set(org.type, list);
        });
        return order.filter((type) => (map.get(type) ?? []).length > 0).map((type) => ({ type, items: map.get(type) ?? [] }));
    }, [organizations]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
            <Head title={t('Select Organization')} />
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-bold text-slate-900">{t('QGurukul')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher variant="site" />
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('Back to Home')}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-5 py-14">
                <div className="mx-auto mb-10 max-w-2xl text-center">
                    <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{t('Select an organization to continue.')}</h1>
                    <p className="mt-3 text-slate-600">{t('Choose the institution you want to visit from the list below.')}</p>
                </div>

                {grouped.length === 0 ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-slate-600">{t('No organizations are available right now.')}</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {grouped.map((group) => {
                            const meta = typeMeta[group.type];
                            const Icon = meta?.icon ?? Building2;
                            return (
                                <section key={group.type}>
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white ${meta?.accent ?? 'from-slate-500 to-slate-600'}`}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <h2 className="text-xl font-semibold text-slate-900">{meta?.label ?? group.type}</h2>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {group.items.map((org) => (
                                            <button
                                                key={org.id}
                                                type="button"
                                                onClick={() => router.post(`/select-organization/${org.id}`)}
                                                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                                            >
                                                {org.logo ? (
                                                    <img
                                                        src={org.logo}
                                                        alt={org.name}
                                                        className="h-12 w-12 rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${meta?.accent ?? 'from-slate-500 to-slate-600'}`}>
                                                        <Icon className="h-6 w-6" />
                                                    </span>
                                                )}
                                                <span>
                                                    <span className="block font-semibold text-slate-900 group-hover:text-indigo-600">
                                                        {org.name}
                                                    </span>
                                                    {org.city && (
                                                        <span className="block text-sm text-slate-500">{org.city}</span>
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}