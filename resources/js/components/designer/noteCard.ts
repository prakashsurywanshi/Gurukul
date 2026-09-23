import { Rect, Textbox, Group, type Object as FabricObject } from 'fabric';
import { substituteTokensInText } from './templateTypes';

export const PX_PER_MM = 96 / 25.4;

/**
 * Fabric Object.customProperties persistence keys for the note card metadata.
 * The designer registers these on the runtime Object class so a save -> load
 * round trip keeps the authoritative card content (rich body HTML etc.).
 */
export const NOTE_CUSTOM_PROPS = [
    'noteTitle',
    'noteBodyHtml',
    'noteFill',
    'noteStroke',
    'noteStrokeWidthMm',
    'noteRadiusMm',
    'noteBodyFontMm',
    'noteBodyFontFamily',
    'noteBodyColor',
    'noteTitleFontMm',
    'noteTitleColor',
    'noteAuto',
] as const;

export interface NoteMeta {
    title: string;
    bodyHtml: string;
    fill: string;
    stroke: string;
    strokeWidthMm: number;
    radiusMm: number;
    bodyFontMm: number;
    bodyFontFamily: string;
    bodyColor: string;
    titleFontMm: number;
    titleColor: string;
    auto: boolean;
}

/** Absolute geometry of the card box on the page, in canvas pixels. */
export interface NoteGeometry {
    leftPx: number;
    topPx: number;
    widthPx: number;
    heightPx: number;
}

export const DEFAULT_NOTE_META: NoteMeta = {
    title: 'Notes',
    bodyHtml:
        '<div>This is to certify that <b>{{student_name}}</b> of {{class_section}} is a bonafide student of {{school_name}} for the session {{academic_session}}.</div>',
    fill: '#f8fafc',
    stroke: '#cbd5e1',
    strokeWidthMm: 0.4,
    radiusMm: 3,
    bodyFontMm: 4,
    bodyFontFamily: 'Arial',
    bodyColor: '#374151',
    titleFontMm: 5,
    titleColor: '#111827',
    auto: true,
};

function decodeNoteEntities(input: string): string {
    const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
    return input.replace(/&(amp|lt|gt|quot|#39);/g, (m) => map[m] ?? m);
}

function escapeNoteHtml(input: string): string {
    return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const NOTE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'DIV', 'SPAN', 'BR', 'UL', 'OL', 'LI']);
const NOTE_TAG_NORM: Record<string, string> = { STRONG: 'B', EM: 'I', P: 'DIV' };

/**
 * Whitelist the note body rich text. Keeps only simple inline formatting
 * (bold / italic / underline / spans / lists / block breaks) with no
 * attributes at all, so the text stays safe to re-inject inside the printable
 * twin (dompdf prints the HTML). Block-level <p> maps to <div> so default
 * browser margins never inject extra gaps on paper.
 */
export function sanitizeNoteHtml(html: string): string {
    if (!html) return '';
    return String(html)
        .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
        .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/<(\/?)\s*([a-zA-Z][^>\s]*)([^>]*)>/g, (_m, close: string, tag: string) => {
            const name = String(tag).toUpperCase();
            if (!NOTE_TAGS.has(name)) return '';
            const n = NOTE_TAG_NORM[name] ?? name;
            return close ? `</${n}>` : `<${n}>`;
        })
        .replace(/(<br\s*\/?>)+/gi, '<br>')
        .slice(0, 40000);
}

/** Plain, unformatted text of a note body (what the on-canvas box shows). */
export function plainFromHtml(html: string): string {
    return decodeNoteEntities(
        String(html ?? '')
            .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
            .replace(/<(br|hr)\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, ''),
    )
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** Convert plain text (e.g. after editing the textbox on canvas) back to HTML. */
export function htmlFromPlain(text: string): string {
    const parts = String(text ?? '').split(/\n+/);
    return parts.map((p) => `<div>${escapeNoteHtml(p)}</div>`).join('');
}

/** Measured height (px) the body HTML needs for a given width at a font size. */
export function measureNoteBodyPx(html: string, widthPx: number, fontMm: number, lineHeight: number, fontFamily: string): number {
    const el = document.createElement('div');
    el.style.cssText =
        'position:absolute;left:-100000px;top:0;visibility:hidden;white-space:normal;word-wrap:break-word;overflow-wrap:break-word;';
    el.style.width = `${Math.max(widthPx, 20)}px`;
    el.style.fontFamily = fontFamily;
    el.style.fontSize = `${fontMm * PX_PER_MM}px`;
    el.style.lineHeight = String(lineHeight);
    el.innerHTML = substituteTokensInText(html);
    document.body.appendChild(el);
    const h = el.offsetHeight || 0;
    document.body.removeChild(el);
    return Math.ceil(h);
}

/**
 * How tall (px) the card needs to be so title + body fit with the same inner
 * padding the builder applies. Sample values drive the measurement so the
 * auto-size matches what the print preview will show.
 */
export function measureNoteHeightPx(meta: NoteMeta, g: NoteGeometry): number {
    const padX = Math.round(2 * PX_PER_MM);
    const padY = Math.round(1.5 * PX_PER_MM);
    const innerW = Math.max(g.widthPx - padX * 2, 16);
    const hasTitle = Boolean(meta.title && meta.title.trim());
    const titleH = hasTitle ? Math.ceil(meta.titleFontMm * PX_PER_MM * 1.25) : 0;
    const bodyH = measureNoteBodyPx(meta.bodyHtml, innerW, meta.bodyFontMm, 1.45, meta.bodyFontFamily);
    return Math.max(padY + titleH + bodyH + padY, 24);
}

function metaToProps(meta: NoteMeta): Record<string, string | number | boolean> {
    return {
        noteTitle: meta.title,
        noteBodyHtml: meta.bodyHtml,
        noteFill: meta.fill,
        noteStroke: meta.stroke,
        noteStrokeWidthMm: meta.strokeWidthMm,
        noteRadiusMm: meta.radiusMm,
        noteBodyFontMm: meta.bodyFontMm,
        noteBodyFontFamily: meta.bodyFontFamily,
        noteBodyColor: meta.bodyColor,
        noteTitleFontMm: meta.titleFontMm,
        noteTitleColor: meta.titleColor,
        noteAuto: meta.auto,
    };
}

/** Persist the authoritative note metadata onto the group (round-trips via JSON). */
export function setNoteMeta(g: Group, meta: NoteMeta): void {
    g.set(metaToProps(meta) as any);
}

interface NoteGroupProps {
    noteTitle?: unknown;
    noteBodyHtml?: unknown;
    noteFill?: unknown;
    noteStroke?: unknown;
    noteStrokeWidthMm?: unknown;
    noteRadiusMm?: unknown;
    noteBodyFontMm?: unknown;
    noteBodyFontFamily?: unknown;
    noteBodyColor?: unknown;
    noteTitleFontMm?: unknown;
    noteTitleColor?: unknown;
    noteAuto?: unknown;
}

export function metaFromGroup(g: FabricObject | null | undefined): NoteMeta | null {
    if (!g) return null;
    const o = g as unknown as NoteGroupProps;
    if (typeof o.noteBodyHtml !== 'string') return null;
    return {
        title: typeof o.noteTitle === 'string' ? o.noteTitle : '',
        bodyHtml: o.noteBodyHtml as string,
        fill: typeof o.noteFill === 'string' ? o.noteFill : DEFAULT_NOTE_META.fill,
        stroke: typeof o.noteStroke === 'string' ? o.noteStroke : DEFAULT_NOTE_META.stroke,
        strokeWidthMm: typeof o.noteStrokeWidthMm === 'number' ? o.noteStrokeWidthMm : DEFAULT_NOTE_META.strokeWidthMm,
        radiusMm: typeof o.noteRadiusMm === 'number' ? o.noteRadiusMm : DEFAULT_NOTE_META.radiusMm,
        bodyFontMm: typeof o.noteBodyFontMm === 'number' ? o.noteBodyFontMm : DEFAULT_NOTE_META.bodyFontMm,
        bodyFontFamily: typeof o.noteBodyFontFamily === 'string' ? o.noteBodyFontFamily : DEFAULT_NOTE_META.bodyFontFamily,
        bodyColor: typeof o.noteBodyColor === 'string' ? o.noteBodyColor : DEFAULT_NOTE_META.bodyColor,
        titleFontMm: typeof o.noteTitleFontMm === 'number' ? o.noteTitleFontMm : DEFAULT_NOTE_META.titleFontMm,
        titleColor: typeof o.noteTitleColor === 'string' ? o.noteTitleColor : DEFAULT_NOTE_META.titleColor,
        auto: o.noteAuto === true,
    };
}

export function noteChildren(g: Group): { bg: Rect | null; title: Textbox | null; body: Textbox | null } {
    const kids = g.getObjects();
    const bg = kids[0] && String(kids[0].type).toLowerCase() === 'rect' ? (kids[0] as Rect) : null;
    const title = kids[1] && String(kids[1].type).toLowerCase() === 'textbox' ? (kids[1] as Textbox) : null;
    const body = kids[2] && String(kids[2].type).toLowerCase() === 'textbox' ? (kids[2] as Textbox) : null;
    return { bg, title, body };
}

/**
 * Build the card's children (background rect + title/body textboxes) for an
 * absolute card box, mirroring the geometry the HTML twin will use.
 */
export function makeNoteChildren(meta: NoteMeta, g: NoteGeometry): { bg: Rect; title: Textbox; body: Textbox } {
    const padX = Math.round(2 * PX_PER_MM);
    const padY = Math.round(1.5 * PX_PER_MM);
    const innerL = g.leftPx + padX;
    const innerW = Math.max(g.widthPx - padX * 2, 16);
    const cardB = g.topPx + g.heightPx;
    const hasTitle = Boolean(meta.title && meta.title.trim());

    const bg = new Rect({
        left: g.leftPx,
        top: g.topPx,
        width: g.widthPx,
        height: g.heightPx,
        rx: Math.round(meta.radiusMm * PX_PER_MM),
        ry: Math.round(meta.radiusMm * PX_PER_MM),
        fill: meta.fill,
        stroke: meta.stroke,
        strokeWidth: Math.max(1, Math.round(meta.strokeWidthMm * PX_PER_MM)),
        name: 'note-bg',
    });

    const tFont = Math.round(meta.titleFontMm * PX_PER_MM);
    const titleRaw = meta.title || '';
    const title = new Textbox(substituteTokensInText(titleRaw), {
        left: innerL,
        top: g.topPx + padY,
        width: innerW,
        fontSize: tFont,
        fontWeight: 'bold',
        fontFamily: meta.bodyFontFamily,
        fill: meta.titleColor,
        lineHeight: 1.25,
        name: 'note-title',
    });
    if (titleRaw.includes('{{')) title.set({ tokenText: titleRaw } as any);

    const titleH = hasTitle ? Math.ceil(tFont * 1.25) : 0;
    const bFont = Math.round(meta.bodyFontMm * PX_PER_MM);
    const bodyTop = g.topPx + padY + titleH;
    const bodyH = Math.max(cardB - padY - bodyTop, 20);
    const bodyRaw = plainFromHtml(meta.bodyHtml);
    const body = new Textbox(substituteTokensInText(bodyRaw), {
        left: innerL,
        top: bodyTop,
        width: innerW,
        height: bodyH,
        fontSize: bFont,
        fontFamily: meta.bodyFontFamily,
        fill: meta.bodyColor,
        lineHeight: 1.45,
        name: 'note-body',
    });
    if (bodyRaw.includes('{{')) body.set({ tokenText: bodyRaw } as any);

    return { bg, title, body };
}

/** Assemble a note card group from an absolute geometry + metadata. */
export function makeNoteGroup(meta: NoteMeta, g: NoteGeometry, name: string): Group {
    const { bg, title, body } = makeNoteChildren(meta, g);
    const group = new Group([bg, title, body], { name } as any);
    group.set(metaToProps(meta) as any);
    return group;
}

/**
 * Resolve the note group for any selected object: a note group itself, or a
 * child (title/body textbox / bg rect) inside one.
 */
export function noteGroupOf(o: FabricObject | null | undefined): Group | null {
    if (!o) return null;
    const self = String((o as { name?: unknown }).name ?? '');
    if (self.startsWith('note:')) return o as Group;
    const parent = (o as { group?: FabricObject }).group;
    if (parent && String((parent as { name?: unknown }).name ?? '').startsWith('note:')) return parent as Group;
    return null;
}

/** Shared default card name embedding a stable tag used in the twin. */
export function noteName(tag: string): string {
    return `note:${tag || 'note'}`;
}