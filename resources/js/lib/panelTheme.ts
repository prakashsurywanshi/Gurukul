import type { CSSProperties } from 'react';

export interface PanelAppearance {
    primary_color: string;
    accent_color: string;
    font_family: string;
    density: string;
    show_logo: boolean;
}

export const PANEL_FONTS = [
    'Instrument Sans',
    'Inter',
    'Poppins',
    'Playfair Display',
    'Noto Sans Devanagari',
    'Merriweather',
];

export const PANEL_DENSITIES = ['compact', 'normal', 'comfortable'];

export const DEFAULT_PANEL_APPEARANCE: PanelAppearance = {
    primary_color: '#2563EB',
    accent_color: '#10B981',
    font_family: 'Instrument Sans',
    density: 'normal',
    show_logo: true,
};

const DENSITY_MAP: Record<string, { font: string; spacing: string }> = {
    compact: { font: '14px', spacing: '0.2rem' },
    normal: { font: '16px', spacing: '0.25rem' },
    comfortable: { font: '17px', spacing: '0.3rem' },
};

export function panelStyleVars(appearance?: PanelAppearance | null): CSSProperties {
    const merged: PanelAppearance = { ...DEFAULT_PANEL_APPEARANCE, ...(appearance ?? {}) };
    const density = DENSITY_MAP[merged.density] ?? DENSITY_MAP.normal;

    return {
        ['--primary' as never]: merged.primary_color,
        ['--ring' as never]: merged.primary_color,
        ['--sidebar-primary' as never]: merged.primary_color,
        ['--sidebar-ring' as never]: merged.primary_color,
        ['--accent' as never]: merged.accent_color,
        ['--font-sans' as never]: `'${merged.font_family}', 'Noto Sans Devanagari', ui-sans-serif, system-ui, sans-serif`,
        ['--font-size' as never]: density.font,
        ['--spacing' as never]: density.spacing,
    } as CSSProperties;
}