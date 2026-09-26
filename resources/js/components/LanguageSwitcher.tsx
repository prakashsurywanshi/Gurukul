import { Languages, Check, ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage, availableLanguages, type LanguageSettings } from '../i18n/LanguageProvider';
import { buttonShineClasses } from '../Pages/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../Pages/ui/dropdown-menu';

interface LanguageSwitcherProps {
    className?: string;
    variant?: 'dashboard' | 'site';
}

export default function LanguageSwitcher({ className = '', variant = 'dashboard' }: LanguageSwitcherProps) {
    const { locale, setLocale, t, settings } = useLanguage();

    const available = useMemo(() => {
        const base = availableLanguages(settings);

        if (variant !== 'site') return base;

        const all = Object.keys(settings?.languages ?? {});
        return [...new Set([...base, ...all])];
    }, [settings, variant]);

    if (available.length <= 1) return null;

    const languages: Record<string, string> = settings?.languages ?? {
        en: 'English',
    };

    const triggerClass =
        variant === 'site'
            ? 'inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold backdrop-blur-xl transition'
            : `dashboard-header-button ${buttonShineClasses} inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-2 shadow-sm transition`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={`${triggerClass} ${className}`}
                    title={t('common.language')}
                    aria-label={t('common.language')}
                >
                    <Languages className={`h-4 w-4 ${variant === 'site' ? 'text-current' : 'text-[var(--primary)]'}`} />
                    <span
                        className={`ml-1 hidden text-xs font-medium md:inline ${variant === 'site' ? 'text-current' : 'text-[var(--foreground)]'}`}
                    >
                        {languages[locale] ?? locale}
                    </span>
                    <ChevronDown
                        className={`ml-0.5 h-3 w-3 ${variant === 'site' ? 'text-current opacity-70' : 'text-[var(--muted-foreground)]'}`}
                    />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuLabel className="text-xs font-medium text-[var(--muted-foreground)]">
                    {t('common.language')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {available.map((code) => (
                    <DropdownMenuItem key={code} onClick={() => setLocale(code)} className="justify-between">
                        <span>{languages[code] ?? code}</span>
                        {locale === code && <Check className="h-4 w-4 text-[var(--primary)]" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
