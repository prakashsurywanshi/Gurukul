import { useEffect, useRef, useState } from 'react';
import { Languages, Pencil } from 'lucide-react';

import { useLanguage } from '../../i18n/LanguageProvider';

interface InlineEditFieldProps {
    value: string;
    onChange: (value: string) => void;
    isEditing: boolean;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
    className?: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
    fieldKey?: string;
    translations?: Record<string, string>;
    onTranslationChange?: (locale: string, value: string) => void;
}

export default function InlineEditField({
    value,
    onChange,
    isEditing,
    as: Tag = 'p',
    className = '',
    placeholder = 'Click to edit...',
    multiline = false,
    rows = 3,
    fieldKey,
    translations,
    onTranslationChange,
}: InlineEditFieldProps) {
    const { t, settings } = useLanguage();
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [showTranslations, setShowTranslations] = useState(false);
    const ref = useRef<HTMLElement>(null);

    const languages = settings?.languages ?? { mr: 'मराठी (Marathi)', hi: 'हिन्दी (Hindi)' };
    const addableLocales = Object.keys(languages).filter((code) => code !== 'en');
    const canTranslate = Boolean(fieldKey && onTranslationChange && isEditing && addableLocales.length > 0);
    const hasTranslations = addableLocales.some((locale) => Boolean(translations?.[locale]?.trim()));

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    if (!isEditing) {
        return <Tag className={className}>{value || placeholder}</Tag>;
    }

    const languagesButton = canTranslate ? (
        <div className="absolute -top-2 right-7 rounded-full bg-emerald-600 p-1 text-white shadow-sm">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowTranslations((current) => !current);
                }}
                title={t('Translations')}
                aria-label={t('Translations')}
                className="flex items-center gap-1"
            >
                <Languages className="h-3 w-3" />
                {hasTranslations && <span className="mr-0.5 h-1.5 w-1.5 rounded-full bg-white" />}
            </button>
        </div>
    ) : null;

    const translationsPanel =
        canTranslate && showTranslations ? (
            <div className="absolute z-40 mt-1 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:bg-[var(--card)]">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">{t('Translations')}</p>
                    <button
                        type="button"
                        onClick={() => setShowTranslations(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                    >
                        {t('Close')}
                    </button>
                </div>
                {addableLocales.map((locale) => (
                    <div key={locale} className="mt-2 first:mt-0">
                        <p className="mb-1 text-[11px] font-medium text-slate-500">{languages[locale]}</p>
                        <input
                            type="text"
                            value={translations?.[locale] ?? ''}
                            onChange={(e) => onTranslationChange && onTranslationChange(locale, e.target.value)}
                            placeholder={t('Optional translation')}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-[var(--border)] dark:bg-[var(--card)]"
                        />
                    </div>
                ))}
            </div>
        ) : null;

    if (multiline) {
        return (
            <div className="group relative">
                <textarea
                    rows={rows}
                    value={localValue}
                    onChange={(e) => {
                        setLocalValue(e.target.value);
                        onChange(e.target.value);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className={`w-full rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/50 px-3 py-2 text-inherit font-inherit resize-y transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
                    style={{ minHeight: `${rows * 1.5}em` }}
                />
                {!isFocused && (
                    <div className="absolute -top-2 -right-2 rounded-full bg-blue-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-3 w-3" />
                    </div>
                )}
                {languagesButton}
                {translationsPanel}
            </div>
        );
    }

    return (
        <div className="group relative inline-block w-full">
            <input
                type="text"
                value={localValue}
                onChange={(e) => {
                    setLocalValue(e.target.value);
                    onChange(e.target.value);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={`w-full rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/50 px-3 py-1 text-inherit font-inherit transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
            />
            {!isFocused && (
                <div className="absolute -top-2 -right-2 rounded-full bg-blue-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3" />
                </div>
            )}
            {languagesButton}
            {translationsPanel}
        </div>
    );
}
