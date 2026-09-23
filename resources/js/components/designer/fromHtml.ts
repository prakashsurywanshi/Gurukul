import { Textbox, Rect, Circle, Image, type Object as FabricObject } from 'fabric';
import {
    DEFAULT_NOTE_META,
    makeNoteGroup,
    noteName,
    sanitizeNoteHtml,
    type NoteMeta,
} from './noteCard';

const PX_PER_MM = 96 / 25.4;

const TOKEN_STANDIN: Record<string, 'avatar' | 'qr' | 'logo'> = {
    student_photo_url: 'avatar',
    staff_photo_url: 'avatar',
    school_logo_url: 'logo',
    principal_signature_url: 'logo',
    class_teacher_signature: 'logo',
    staff_signature: 'logo',
    qr_code_url: 'qr',
    secure_attendance_qr: 'qr',
    barcode_url: 'qr',
};

function parseCss(style = ''): Record<string, string> {
    const out: Record<string, string> = {};
    for (const match of style.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
        out[match[1].trim()] = match[2].trim();
    }
    return out;
}

function num(value: string | undefined, fallback = 0): number {
    if (!value) return fallback;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const px = (mm: number) => Math.round(mm * PX_PER_MM);

function decodeEntities(input: string): string {
    const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
    return input.replace(/&(amp|lt|gt|quot|#39);/g, (m) => map[m] ?? m);
}

// ---------------------------------------------------------------------------
// Note card blocks. The twin emits `<div data-el="note" ...>` whose body div
// itself contains nested <div>s (rich card text), so a flat regex cannot catch
// it. A balanced-<div> walker isolates each note block and strips it from the
// markup that the classic flat parser sees, so nested title/body divs are never
// mistaken for standalone text spans.
// ---------------------------------------------------------------------------

interface NoteRawBlock {
    tag: string;
    meta: NoteMeta;
    leftPx: number;
    topPx: number;
    widthPx: number;
    heightPx: number;
}

/** Return the inner HTML of the <div> that starts at `from`, plus its end index. */
function sliceDiv(src: string, from: number): { inner: string; end: number } {
    const gtIdx = src.indexOf('>', from);
    if (gtIdx === -1) return { inner: '', end: from };
    let depth = 1;
    let j = gtIdx + 1;
    while (j < src.length) {
        const no = src.indexOf('<div', j);
        const nc = src.indexOf('</div>', j);
        if (nc === -1) break;
        if (no !== -1 && no < nc) {
            const cut = src.slice(no, src.indexOf('>', no) + 1);
            if (!/\/\s*>\s*$/.test(cut)) depth += 1;
            j = no + 4;
        } else {
            depth -= 1;
            if (depth === 0) return { inner: src.slice(gtIdx + 1, nc), end: nc };
            j = nc + 6;
        }
    }
    return { inner: '', end: src.length };
}

function noteStyle(openTag: string, from: number, raw: string): Record<string, string> {
    const t = raw.indexOf('style="', from);
    const tsEnd = t !== -1 ? raw.indexOf('"', t + 7) : -1;
    return t !== -1 && tsEnd !== -1 ? parseCss(raw.slice(t + 7, tsEnd)) : {};
}

function parseNoteBlockRaw(raw: string): NoteRawBlock {
    const openTag = raw.slice(0, raw.indexOf('>') + 1);
    const style = noteStyle(openTag, 0, openTag);
    const tag = (raw.match(/data-tag="([^"]+)"/) || [])[1] || 'note';

    let title = '';
    let titleFontMm = DEFAULT_NOTE_META.titleFontMm;
    let titleColor = DEFAULT_NOTE_META.titleColor;
    const ti = raw.indexOf('data-el="note-title"');
    if (ti !== -1) {
        const openStart = raw.lastIndexOf('<div', ti);
        const tSty = noteStyle('', ti, raw);
        const { inner } = sliceDiv(raw, openStart);
        title = decodeEntities(inner).trim();
        titleFontMm = num(tSty['font-size'], DEFAULT_NOTE_META.titleFontMm);
        titleColor = tSty.color ?? DEFAULT_NOTE_META.titleColor;
    }

    let bodyHtml = DEFAULT_NOTE_META.bodyHtml;
    let bodyFontMm = DEFAULT_NOTE_META.bodyFontMm;
    let bodyFontFamily = DEFAULT_NOTE_META.bodyFontFamily;
    let bodyColor = DEFAULT_NOTE_META.bodyColor;
    const bi = raw.indexOf('data-el="note-body"');
    if (bi !== -1) {
        const openStart = raw.lastIndexOf('<div', bi);
        const bSty = noteStyle('', bi, raw);
        const { inner } = sliceDiv(raw, openStart);
        bodyHtml = sanitizeNoteHtml(inner.trim());
        bodyFontMm = num(bSty['font-size'], DEFAULT_NOTE_META.bodyFontMm);
        bodyFontFamily = bSty['font-family'] ?? DEFAULT_NOTE_META.bodyFontFamily;
        bodyColor = bSty.color ?? DEFAULT_NOTE_META.bodyColor;
    }

    const bg = style.background ?? DEFAULT_NOTE_META.fill;
    const borderMatch = (style.border ?? '').match(/([\d.]+)mm\s+solid\s+(#[0-9a-fA-F]{3,8})/);
    const meta: NoteMeta = {
        title,
        bodyHtml,
        fill: bg,
        stroke: borderMatch?.[2] ?? DEFAULT_NOTE_META.stroke,
        strokeWidthMm: borderMatch ? num(borderMatch[1]) : DEFAULT_NOTE_META.strokeWidthMm,
        radiusMm: num(style['border-radius'], DEFAULT_NOTE_META.radiusMm),
        bodyFontMm,
        bodyFontFamily,
        bodyColor,
        titleFontMm,
        titleColor,
        auto: true,
    };

    return {
        tag,
        meta,
        leftPx: px(num(style.left)),
        topPx: px(num(style.top)),
        widthPx: Math.max(px(num(style.width)), 8),
        heightPx: Math.max(px(num(style.height)), 8),
    };
}

type ParseItem = { kind: 'note'; block: NoteRawBlock } | { kind: 'flat'; html: string };

/** Split the twin into note blocks and flat elements, preserving document order. */
function splitTwin(src: string): ParseItem[] {
    const items: ParseItem[] = [];
    let i = 0;
    let flatStart = 0;
    const flush = (to: number) => {
        if (to > flatStart) items.push({ kind: 'flat', html: src.slice(flatStart, to) });
    };
    while (i < src.length) {
        const openIdx = src.indexOf('<div', i);
        if (openIdx === -1) break;
        const gtIdx = src.indexOf('>', openIdx + 4);
        if (gtIdx === -1) break;
        const openTag = src.slice(openIdx, gtIdx + 1);
        if (!/data-el="note"/.test(openTag)) {
            i = gtIdx + 1;
            continue;
        }
        const { end } = sliceDiv(src, openIdx);
        if (end <= gtIdx || end >= src.length) {
            i = gtIdx + 1;
            continue;
        }
        flush(openIdx);
        items.push({ kind: 'note', block: parseNoteBlockRaw(src.slice(openIdx, end + 6)) });
        i = end + 6;
        flatStart = i;
    }
    flush(src.length);
    return items;
}

/**
 * Rebuild fabric objects from an HTML twin. Used when fabric's loadFromJSON
 * fails or hangs so designs authored by the generator (or saved twins) always
 * remain visible and editable in the canvas designer.
 */
export async function objectsFromHtml(
    twin: string | null | undefined,
    widthPx: number,
    heightPx: number,
    standins: { avatar: string; qr: string; logo: string },
): Promise<FabricObject[]> {
    if (!twin) return [];

    const objects: FabricObject[] = [];
    const childRe = /<(div|span|img|table)\b([^>]*?)(?:\/>|>(.*?)<\/\1>)/gs;

    for (const item of splitTwin(twin)) {
        if (item.kind === 'note') {
            const b = item.block;
            objects.push(
                makeNoteGroup(
                    b.meta,
                    { leftPx: b.leftPx, topPx: b.topPx, widthPx: b.widthPx, heightPx: b.heightPx },
                    noteName(b.tag),
                ),
            );
            continue;
        }

        childRe.lastIndex = 0;
        const seg = item.html;
        let match: RegExpExecArray | null;
        while ((match = childRe.exec(seg))) {
            const tag = match[1];
            const attrs = match[2] ?? '';
            const inner = match[3] ?? '';
            const el = (attrs.match(/data-el="([^"]+)"/) || [])[1] || '';
            const token = (attrs.match(/data-token="([^"]+)"/) || [])[1] || null;
            const style = parseCss((attrs.match(/style="([^"]*)"/) || [])[1] || '');

            const left = px(num(style.left));
            const top = px(num(style.top));
            const width = px(num(style.width));
            const height = px(num(style.height));
            const opacity = num(style.opacity, 1);

            if (tag === 'table') {
                // A real <table> in the twin becomes an editable "table region"
                // placeholder (fill + captured inner text). The authoritative table
                // HTML is re-injected by the slot renderers at print time.
                const boxW = Math.max(width, px(num(attrs.match(/\bwidth="([\d.]+)"/)?.[1], 0)) , Math.round(widthPx * 0.9));
                const boxH = Math.max(height, 24);
                const innerText = decodeEntities(inner.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().substring(0, 140);
                objects.push(
                    new Rect({
                        left,
                        top,
                        width: boxW,
                        height: boxH,
                        fill: '#f1f5f9',
                        stroke: '#cbd5e1',
                        strokeWidth: 1,
                        rx: 4,
                        ry: 4,
                        opacity,
                        name: 'shape:rect',
                    } as any),
                );
                objects.push(
                    new Textbox(innerText || 'Table', {
                        left: left + 4,
                        top: top + 4,
                        width: boxW - 8,
                        fontSize: 9,
                        fill: '#475569',
                        fontFamily: 'Arial',
                        name: 'text',
                    } as any),
                );
                continue;
            }

            if (tag === 'img') {
                const standinKey = token ? (TOKEN_STANDIN[token] ?? 'logo') : 'logo';
                const src = standins[standinKey];
                try {
                    const img = await Image.fromURL(src, { crossOrigin: 'anonymous' } as any);
                    img.set({ left, top, width, height, scaleX: width / (img.width || width), scaleY: height / (img.height || height), opacity, name: `token:${token ?? 'image'}` });
                    const radius = style['border-radius'] ?? '';
                    if (radius && radius.includes('%')) {
                        img.clipPath = new Circle({ left, top, radius: Math.min(width, height) / 2, absolutePositioned: true } as any);
                    } else if (radius && parseFloat(radius) > 0) {
                        img.clipPath = new Rect({ left, top, width, height, rx: px(parseFloat(radius)), ry: px(parseFloat(radius)), absolutePositioned: true } as any);
                    }
                    objects.push(img);
                } catch {
                    // skip broken images
                }
                continue;
            }

            const color = /^rgba\(0,\s*0,\s*0,\s*0\)$/.test(style.color ?? '') ? 'transparent' : (style.color ?? '#111827');
            const radius = num(style['border-radius']);

            if (el === 'shape') {
                const bg = style.background ? (/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(style.background) ? 'transparent' : style.background) : '#ffffff';
                const border = style.border ?? '';
                const borderMatch = border.match(/([\d.]+)mm\s+solid\s+(#[0-9a-fA-F]{3,8})/);
                objects.push(
                    new Rect({
                        left,
                        top,
                        width,
                        height,
                        fill: bg,
                        stroke: borderMatch?.[2] ?? '',
                        strokeWidth: borderMatch ? px(num(borderMatch[1])) : 0,
                        rx: px(radius),
                        ry: px(radius),
                        opacity,
                        name: 'shape:rect',
                    } as any),
                );
                continue;
            }

            if (el !== 'text' && el !== 'var') continue;

            const fontSize = px(num(style['font-size'], 3));
            const textAlign = (style['text-align'] ?? 'left') as 'left' | 'center' | 'right';
            const content = decodeEntities(inner).trim();
            const text = token ? `{{${token}}}` : content;

            if (el === 'var') {
                const placeholder = new Textbox(token ? `{{${token}}}` : text, {
                    left,
                    top,
                    width,
                    height,
                    fontSize,
                    fontFamily: style['font-family'] ?? 'Arial',
                    fill: color,
                    fontWeight: style['font-weight'] || 'normal',
                    fontStyle: style['font-style'] || 'normal',
                    textAlign,
                    opacity,
                    editable: false,
                    lockEditing: true,
                    name: `placeholder:${token ?? 'variable'}`,
                } as any);
                objects.push(placeholder);
                continue;
            }

            objects.push(
                new Textbox(text, {
                    left,
                    top,
                    width,
                    height,
                    fontSize,
                    fontFamily: style['font-family'] ?? 'Arial',
                    fill: color,
                    fontWeight: style['font-weight'] || 'normal',
                    fontStyle: style['font-style'] || 'normal',
                    underline: (style['text-decoration'] ?? '').includes('underline'),
                    textAlign,
                    opacity,
                    name: 'text',
                } as any),
            );
        }
    }

    if (objects.length === 0) {
        objects.push(
            new Textbox('Design loaded from twin preview', {
                left: 16,
                top: 16,
                width: Math.max(120, widthPx / 2),
                fontSize: 14,
                fill: '#94a3b8',
                textAlign: 'left',
                name: 'text',
            } as any),
        );
    }

    return objects;
}

export { PX_PER_MM };