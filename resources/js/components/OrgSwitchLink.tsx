import { Link, usePage } from '@inertiajs/react';
import { ArrowRightLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { CurrentUser } from '../Pages/Home';

export default function OrgSwitchLink({
    user,
    className = '',
}: {
    user?: CurrentUser | null;
    className?: string;
}) {
    const { t } = useLanguage();
    const page = usePage();
    const activeOrgCount = (page.props as any).activeOrganizationCount ?? 0;

    if (user || activeOrgCount < 2) {
        return null;
    }

    return (
        <Link
            href="/select-organization"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${className}`}
        >
            <ArrowRightLeft className="h-4 w-4" />
            {t('Switch Organization')}
        </Link>
    );
}