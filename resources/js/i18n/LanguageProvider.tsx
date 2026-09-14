import { router, usePage } from '@inertiajs/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import mr from './mr';
import hi from './hi';

const DICTIONARIES: Record<string, Record<string, string>> = { en, mr, hi };
const COOKIE_NAME = 'locale';

export interface LanguageSettings {
    dual_language_enabled: boolean;
    regional_language: string;
    regional_language_name?: string;
    universal_language_enabled: boolean;
    available_universal_languages: string[];
    primary_language: string;
    languages: Record<string, string>;
    locale?: string;
    manual_translations?: Record<string, Record<string, string>>;
}

export function readLocaleCookie(): string {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : 'en';
}

export function setLocaleCookie(locale: string, maxAgeSeconds = 31536000): void {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(locale)};path=/;max-age=${maxAgeSeconds};SameSite=Lax`;
}

export function availableLanguages(settings: LanguageSettings | null): string[] {
    const available: string[] = ['en'];

    if (!settings) return available;

    // The dashboard/site UI language is a universal-language concept: every
    // language present in the system (English, Marathi, Hindi, ...) is offered.
    // The regional language is only for student records / certificates and
    // never appears here on its own — it only shows up if it is also present
    // in the system's universal languages.
    for (const code of settings.available_universal_languages ?? []) {
        if (code && !available.includes(code)) {
            available.push(code);
        }
    }

    return available;
}

interface LanguageContextValue {
    locale: string;
    setLocale: (locale: string) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    settings: LanguageSettings | null;
}

const LanguageContext = createContext<LanguageContextValue>({
    locale: 'en',
    setLocale: () => {},
    t: (key: string) => key,
    settings: null,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const props = usePage().props as Record<string, unknown>;
    const settings = (props?.languageSettings as LanguageSettings | undefined) ?? null;

    const [storedLocale, setStoredLocale] = useState<string>(() => {
        if (settings?.locale) return settings.locale;
        return readLocaleCookie();
    });

    const available = useMemo(() => availableLanguages(settings), [settings]);

    const locale = useMemo(() => {
        if (available.includes(storedLocale)) return storedLocale;
        return available.includes('en') ? 'en' : (available[0] ?? 'en');
    }, [available, storedLocale]);

    const setLocale = useCallback((next: string) => {
        setStoredLocale(next);
        setLocaleCookie(next);
        router.reload();
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            // Manual overrides (added via the Language Manual Entry editor) win
            // over the built-in dictionaries.
            const manual = settings?.manual_translations?.[locale];
            const dict = DICTIONARIES[locale] ?? en;
            let translated = manual?.[key] ?? dict[key] ?? en[key] ?? key;
            if (params && Object.keys(params).length > 0) {
                Object.entries(params).forEach(([name, value]) => {
                    translated = translated.replaceAll(`{${name}}`, String(value));
                });
            }
            return translated;
        },
        [locale, settings],
    );

    useEffect(() => {
        document.documentElement.lang = locale;

        // RTL-safe layout readiness: every current locale is a left-to-right
        // script, but the document direction is always set explicitly so that
        // future right-to-left locales (Arabic, Urdu, ...) can be added here
        // without touching the rest of the UI.
        const RTL_LOCALES: Record<string, boolean> = {
            ar: true,
            ur: true,
            fa: true,
        };
        document.documentElement.dir = RTL_LOCALES[locale] ? 'rtl' : 'ltr';
    }, [locale]);

    const value = useMemo<LanguageContextValue>(
        () => ({ locale, setLocale, t, settings }),
        [locale, setLocale, t, settings],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    return useContext(LanguageContext);
}
