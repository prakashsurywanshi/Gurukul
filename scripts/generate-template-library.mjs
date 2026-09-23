#!/usr/bin/env node
/**
 * Authoring engine for the QGurukul template library.
 *
 * Produces ORIGINAL designs (no scraped assets) for every gallery category,
 * one JSON seed asset per template. Each asset carries:
 *   - content       : printable HTML twin (cd-page, #mm units, {{token}} vars)
 *   - content_json  : Fabric v6 serialization (loadFromJSON compatible)
 *   - card sizes    : millimetres
 *
 * The same layout spec drives both outputs so the Canvas Designer can edit
 * any library design and re-save it with identical rendering.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'database', 'seeders', 'template-library');

const PX = 96 / 25.4; // px per mm (96dpi)

// ---------------------------------------------------------------------------
// Stand-in image data URIs (mirror app/Http/Controllers/CanvasDesignerController)
// ---------------------------------------------------------------------------
const dataUri = (body, w, h) =>
    'data:image/svg+xml;base64,' +
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`).toString('base64');

const AVATAR = dataUri('<circle cx="60" cy="42" r="32" fill="#bfdbfe"/><path d="M6 136c4-38 26-54 54-54s50 16 54 54z" fill="#bfdbfe"/>', 120, 140);
const LOGO = dataUri('<circle cx="60" cy="60" r="54" fill="#4f46e5"/><text x="60" y="78" font-size="52" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">G</text>', 120, 120);
const QR = dataUri(
    Array.from({ length: 121 }, (_, i) => {
        const on = [0,1,2,3,4,5,6, 8,9,10,11,12,13,14, 16,17,18,19,20,21,22, 24,25,26,27,28,29,30, 32,33,34,35,36,37,38, 40,41,42,43,44,45,46, 48,49,50,51,52,53,54, 66,67,69,70,73,74,76,79,80,83,86,87,88,91,92,95,96,97,98,101,103,105,107,108,111,113,114,116,117,119].includes(i);
        return on ? `<rect x="${(i % 11) * 12}" y="${Math.floor(i / 11) * 12}" width="12" height="12" fill="#0f172a"/>` : '';
    }).join(''),
    140, 140
);
const SIGN = dataUri('<path d="M8 72 C28 18 40 96 58 40 S88 64 118 28" stroke="#475569" stroke-width="4" fill="none" stroke-linecap="round"/>', 120, 80);
const SEAL = dataUri('<circle cx="70" cy="70" r="40" fill="#fef3c7"/><circle cx="70" cy="70" r="36" stroke="#b45309" stroke-width="3" fill="none"/><text x="70" y="82" font-size="34" text-anchor="middle" fill="#b45309" font-family="Arial" font-weight="700">★</text>', 140, 140);

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------
const PALETTES = [
    { name: 'indigo', main: '#4f46e5', dark: '#1e1b4b', soft: '#e0e7ff', warm: '#f8fafc', ink: '#0f172a' },
    { name: 'emerald', main: '#059669', dark: '#064e3b', soft: '#d1fae5', warm: '#f8fafc', ink: '#0f172a' },
    { name: 'rose', main: '#e11d48', dark: '#881337', soft: '#ffe4e6', warm: '#fdf2f8', ink: '#4c0519' },
    { name: 'amber', main: '#d97706', dark: '#78350f', soft: '#fef3c7', warm: '#fffbeb', ink: '#451a03' },
    { name: 'sky', main: '#0284c7', dark: '#0c4a6e', soft: '#e0f2fe', warm: '#f0f9ff', ink: '#082f49' },
    { name: 'violet', main: '#7c3aed', dark: '#4c1d95', soft: '#ede9fe', warm: '#f5f3ff', ink: '#2e1065' },
    { name: 'slate', main: '#475569', dark: '#0f172a', soft: '#e2e8f0', warm: '#f8fafc', ink: '#0f172a' },
    { name: 'teal', main: '#0d9488', dark: '#134e4a', soft: '#ccfbf1', warm: '#f0fdfa', ink: '#042f2e' },
    { name: 'orange', main: '#ea580c', dark: '#7c2d12', soft: '#ffedd5', warm: '#fff7ed', ink: '#431407' },
];

// ---------------------------------------------------------------------------
// Layout engine
// Layouts are described in mm; converters emit fabric JSON and HTML twins.
//   block kinds:
//     rect{x,y,w,h,fill?,stroke?,sw?,rx?,opacity?}
//     text{x,y,w,h,text,size,weight?,italic?,align?,fill?,font?,opacity?,underline?}
//     img {x,y,w,h,tag,frame?}   frame: 'square'|'circle'|'rounded'
//     seal{x,y,w}   decorative award seal
//     grid{x,y,w,h,cols,heads?,rows,cellH,headFill?,lineFill?}  marksheet table
// ---------------------------------------------------------------------------

const mmToPx = (v) => Math.round(v * PX);

// ---------------------------------------------------------------------------
// SVG thumbnails (rendered from the HTML twin so gallery previews match the
// printable output exactly)
// ---------------------------------------------------------------------------
const TOKEN_LABELS = {
    school_name: 'Gurukul Public School',
    student_name: 'Aarav Mehta',
    admission_no: 'ADM-2026-001',
    roll_no: 'Roll: 5',
    class_section: 'Class 10 - A',
    class: 'Class 10',
    section: 'Section A',
    dob: '15 Mar 2012',
    blood_group: 'O+',
    house: 'Blue House',
    academic_session: '2026-2027',
    class_teacher_name: 'Ms. Kavita Patil',
    class_teacher_designation: 'Class Teacher',
    father_name: 'Rajesh Mehta',
    mother_name: 'Sunita Mehta',
    guardian_phone: '98765 43210',
    emergency_contact: '98765 43210',
    current_address: '12, MG Road, Jaipur',
    transport_route: 'Route 4',
    staff_name: 'Kavita Patil',
    staff_no: 'EMP-0021',
    designation: 'Class Teacher',
    department: 'Academics',
    current_date: '20 Sep 2026',
    issue_date: '20 Sep 2026',
    issued_by: 'Principal',
    achievement: 'Certificate of Achievement',
    exam_name: 'Term 1 Examination',
    exam_session: '2026-2027',
    exam_start_date: '10 Sep 2026',
    exam_end_date: '25 Sep 2026',
};

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const unescapeHtml = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);

const parseCss = (style = '') => {
    const out = {};
    for (const m of style.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) out[m[1].trim()] = m[2].trim();
    return out;
};
const numVal = (v, fallback = 0) => {
    if (v == null) return fallback;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : fallback;
};
const fillOf = (color, fallback = '#e2e8f0') =>
    color && /^rgba\(0,\s*0,\s*0,\s*0\)$/.test(color) ? 'none' : color || fallback;

const toSvgThumb = (content, wMm, hMm) => {
    const W = numVal(wMm, 210);
    const H = numVal(hMm, 297);
    const parts = [`<rect width="${W}" height="${H}" fill="#ffffff"/>`];
    const childRe = /<(div|span|img)\b([^>]*?)(?:\/>|>(.*?)<\/\1>)/gs;
    let m;

    while ((m = childRe.exec(content))) {
        const tag = m[1];
        const attrs = m[2] ?? '';
        const inner = m[3] ?? '';
        const el = (attrs.match(/data-el="([^"]+)"/) || [])[1] || '';
        const token = (attrs.match(/data-token="([^"]+)"/) || [])[1] || null;
        const style = parseCss((attrs.match(/style="([^"]*)"/) || [])[1] || '');

        const left = numVal(style.left);
        const top = numVal(style.top);
        const width = numVal(style.width);
        const height = numVal(style.height);
        const opacity = numVal(style.opacity, 1);

        if (tag === 'img') {
            const kind = /logo|seal|signature/i.test(token || '') ? 'logo' : /qr|barcode/i.test(token || '') ? 'qr' : 'photo';
            const rx = kind === 'logo' ? width / 2 : kind === 'qr' ? width * 0.14 : width * 0.06;
            const glyph = kind === 'logo' ? 'G' : kind === 'qr' ? '&#9634;' : '&#9679;';
            parts.push(
                `<rect x="${left}" y="${top}" width="${width}" height="${height}" rx="${rx}" fill="#eef2f7" stroke="#cbd5e1" stroke-width="0.3" opacity="${opacity}"/>`,
                `<text x="${left + width / 2}" y="${top + height / 2}" font-size="${height * 0.55}" text-anchor="middle" dominant-baseline="central" fill="#94a3b8" opacity="${opacity}">${glyph}</text>`
            );
            continue;
        }

        const color = fillOf(style.color, '#111827');

        if (el === 'shape' || el === 'note') {
            const bg = fillOf(style.background);
            const border = style.border || '';
            const bm = border.match(/([\d.]+)mm\s+solid\s+(#[0-9a-fA-F]{3,8})/);
            const rx = numVal(style['border-radius']);
            const fill = bg === 'none' ? 'none' : bg;
            parts.push(
                `<rect x="${left}" y="${top}" width="${width}" height="${height}" rx="${rx}" fill="${fill}"${bm ? ` stroke="${bm[2]}" stroke-width="${bm[1]}"` : ''} opacity="${opacity}"/>`
            );
            continue;
        }

        if (el === 'note-title' || el === 'note-body') {
            const fontSize = numVal(style['font-size'], 4);
            const lineHeight = numVal(style['line-height'], fontSize * 1.25);
            const align = style['text-align'] || 'left';
            const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
            const x = align === 'center' ? left + width / 2 : align === 'right' ? left + width : left;
            const y = top + lineHeight / 2;
            const text = (unescapeHtml(inner).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim();
            if (!text) continue;
            const weight = style['font-weight'] || (el === 'note-title' ? 'bold' : 'normal');
            parts.push(
                `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${style['font-family'] || 'Arial'}"` +
                    ` font-weight="${weight}" fill="${fillOf(style.color, '#111827')}" text-anchor="${anchor}"` +
                    ` dominant-baseline="central"${style['font-style'] === 'italic' ? ' font-style="italic"' : ''} opacity="${opacity}">` +
                    `${esc(text)}</text>`
            );
            continue;
        }

        if (el !== 'text' && el !== 'var') continue;

        const fontSize = numVal(style['font-size'], 3);
        const lineHeight = numVal(style['line-height'], height || fontSize * 1.2);
        const align = style['text-align'] || 'center';
        const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
        const x = align === 'center' ? left + width / 2 : align === 'right' ? left + width : left;
        const y = top + lineHeight / 2;
        let text = unescapeHtml(inner).trim();
        if (token) text = TOKEN_LABELS[token] ?? text;
        if (!text) continue;
        const textXml = esc(text);

        parts.push(
            `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${style['font-family'] || 'Arial'}"` +
                ` font-weight="${style['font-weight'] || 'normal'}" fill="${color}" text-anchor="${anchor}"` +
                ` dominant-baseline="central"${style['font-style'] === 'italic' ? ' font-style="italic"' : ''} opacity="${opacity}">` +
                `${textXml}</text>`
        );
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;

    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

const toFabric = (blocks, wMm, hMm) => {
    const objects = [];
    for (const b of blocks) {
        const L = mmToPx(b.x);
        const T = mmToPx(b.y);
        const W = mmToPx(b.w);
        const H = mmToPx(b.h);
        const base = { version: '6.9.1', originX: 'left', originY: 'top', left: L, top: T, angle: 0, opacity: b.opacity ?? 1 };
        if (b.k === 'rect') {
            objects.push({
                type: 'rect',
                ...base,
                width: W,
                height: H,
                fill: typeof b.fill === 'string' ? b.fill : '#ffffff',
                stroke: b.stroke || '',
                strokeWidth: mmToPx(b.sw ?? 0),
                rx: mmToPx(b.rx ?? 0),
                ry: mmToPx(b.rx ?? 0),
                name: 'shape:' + (b.shapeName || 'rect'),
            });
        } else if (b.k === 'text') {
            objects.push({
                type: 'textbox',
                ...base,
                width: W,
                height: H,
                text: b.token ? '{{' + b.token + '}}' : (b.text ?? ''),
                fontSize: mmToPx(b.size),
                fontFamily: b.font || 'Arial',
                fill: b.fill || '#0f172a',
                fontWeight: b.weight || 'normal',
                fontStyle: b.italic ? 'italic' : 'normal',
                underline: !!b.underline,
                textAlign: b.align || 'left',
                lineHeight: 1,
                charSpacing: 0,
                name: b.token ? 'token:' + b.token : 'text',
            });
        } else if (b.k === 'seal') {
            const pts = starPoints(5, W / 2, W / 4, [W / 2, H / 2]);
            objects.push({
                type: 'polygon',
                ...base,
                points: pts.map(([x, y]) => ({ x, y })),
                fill: b.fill || '#b45309',
                name: 'shape:seal',
            });
            objects.push({
                type: 'circle',
                ...base,
                left: L + Math.round(W / 2) - mmToPx(b.w / 2),
                top: T + Math.round(H / 2) - mmToPx(b.w / 2),
                radius: mmToPx(b.w * 0.42),
                fill: 'rgba(255,255,255,0)',
                stroke: b.stroke || '#b45309',
                strokeWidth: mmToPx(0.6),
                name: 'shape:seal-ring',
            });
        } else if (b.k === 'img') {
            const src = b.tag === 'student_photo_url' || b.tag === 'staff_photo_url' ? AVATAR : b.tag === 'school_logo_url' ? LOGO : b.tag.includes('qr') ? QR : SIGN;
            const ratio = b.ratio ?? 1;
            const nw = 120;
            const nh = Math.round(120 / ratio);
            objects.push({
                type: 'image',
                ...base,
                width: nw,
                height: nh,
                scaleX: W / nw,
                scaleY: H / nh,
                src,
                crossOrigin: null,
                name: `token:${b.tag}`,
            });
        } else if (b.k === 'grid') {
            const headFill = b.headFill || b.fill || '#0f172a';
            const lineFill = b.lineFill || '#e2e8f0';
            objects.push({ type: 'rect', ...base, width: W, height: H, fill: 'rgba(255,255,255,0)', stroke: lineFill, strokeWidth: mmToPx(0.2), rx: 0, ry: 0, opacity: 1, name: 'shape:grid' });
            const cw = W / b.cols;
            for (let c = 0; c < b.cols; c++) {
                objects.push({ type: 'rect', ...base, left: L + Math.round(c * cw), top: T, width: Math.max(1, Math.round(cw)), height: b.headH ? mmToPx(b.headH) : mmToPx(6), fill: headFill, rx: 0, ry: 0, opacity: 1, name: 'shape:grid-head' });
            }
            const rows = b.rows ?? 0;
            for (let r = 0; r < rows; r++) {
                const y = T + (b.headH ? mmToPx(b.headH) : mmToPx(6)) + Math.round(r * b.cellH);
                objects.push({ type: 'rect', ...base, left: L, top: y, width: W, height: mmToPx(b.cellH), fill: r % 2 === 0 ? '#ffffff' : '#f8fafc', rx: 0, ry: 0, opacity: 1, name: 'shape:grid-row' });
            }
        }
    }
    return { version: '6.9.1', objects };
};

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toHtml = (blocks, wMm, hMm) => {
    const parts = [`<div class="cd-page" style="position:relative;width:${wMm}mm;height:${hMm}mm;overflow:hidden;background:#fff;">`];
    for (const b of blocks) {
        const pos = `position:absolute;left:${b.x}mm;top:${b.y}mm;width:${b.w}mm;height:${b.h}mm;opacity:${b.opacity ?? 1};`;
        if (b.k === 'rect') {
            const fill = typeof b.fill === 'string' ? `background:${b.fill};` : 'background:#fff;';
            const stroke = b.stroke ? `border:${b.sw ?? 0}mm solid ${b.stroke};` : '';
            const rad = b.rx ? `border-radius:${b.rx}mm;` : '';
            parts.push(`<div data-el="shape" style="${pos}${fill}${stroke}${rad}"></div>`);
        } else if (b.k === 'text') {
            const fill = `color:${b.fill || '#0f172a'};`;
            const deco = [b.underline ? 'underline' : ''].filter(Boolean).join(' ');
            const display = b.token ? '{{' + esc(b.token) + '}}' : esc(b.text ?? '');
            parts.push(
                `<span data-el="${b.token ? 'var' : 'text'}"${b.token ? ` data-token="${esc(b.token)}"` : ''} style="${pos}${fill}font-size:${b.size}mm;font-family:${b.font || 'Arial'};font-weight:${b.weight || 'normal'};font-style:${b.italic ? 'italic' : 'normal'};text-decoration:${deco || 'none'};text-align:${b.align || 'left'};line-height:${b.h}mm;overflow:hidden;display:block;">${display}</span>`
            );
        } else if (b.k === 'seal') {
            parts.push(`<img data-el="img" data-token="seal" style="${pos}object-fit:contain;" src="${SEAL}"/>`);
        } else if (b.k === 'img') {
            const frame = b.frame === 'circle' ? '50%' : b.frame === 'rounded' ? '3mm' : '0';
            parts.push(`<img data-el="img" data-token="${esc(b.tag)}" style="${pos}object-fit:cover;border-radius:${frame};" src="{{${esc(b.tag)}}}"/>`);
        } else if (b.k === 'grid') {
            const headH = b.headH ?? 6;
            const heads = (b.heads || []).slice(0, b.cols);
            const cw = b.w / b.cols;
            parts.push(`<div data-el="shape" style="${pos}border:0.2mm solid ${b.lineFill || '#e2e8f0'};"></div>`);
            heads.forEach((label, c) => {
                parts.push(
                    `<span data-el="text" style="position:absolute;left:${b.x + c * cw}mm;top:${b.y}mm;width:${cw}mm;height:${headH}mm;color:${b.headText || '#ffffff'};background:${b.headFill || b.fill || '#0f172a'};font-size:${b.headSize || 2.4}mm;font-weight:bold;text-align:center;line-height:${headH}mm;">${esc(label)}</span>`
                );
            });
            const rows = b.rows ?? 0;
            for (let r = 0; r < rows; r++) {
                const y = b.y + headH + r * b.cellH;
                parts.push(
                    `<div data-el="shape" style="position:absolute;left:${b.x}mm;top:${y}mm;width:${b.w}mm;height:${b.cellH}mm;background:${r % 2 === 0 ? '#ffffff' : '#f8fafc'};"></div>`
                );
            }
        }
    }
    parts.push('</div>');
    return parts.join('\n');
};

function starPoints(points, outer, inner, [cx, cy]) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

// ---------------------------------------------------------------------------
// Skins — each returns a list of blocks (in mm) for a given config.
// ---------------------------------------------------------------------------

// 1. classic-center: double rule, centered title, 2-col field grid, signatures.
function classicCenter(cfg, pal, fields, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const blocks = [];
    const margin = opts.margin ?? 14;
    const titleSize = opts.titleSize ?? 9;
    const subSize = opts.subSize ?? 4;
    const fieldX = margin + (opts.fieldPadL ?? 0);
    const fieldW = w - margin * 2 - (opts.fieldPadL ?? 0) * 2;

    // outer frame
    blocks.push({ k: 'rect', x: 5, y: 5, w: w - 10, h: h - 10, fill: '#ffffff', stroke: pal.main, sw: 1, rx: 4 });
    blocks.push({ k: 'rect', x: 8, y: 8, w: w - 16, h: h - 16, fill: 'rgba(0,0,0,0)', stroke: pal.main, sw: 0.3, rx: 2 });

    // watermark
    blocks.push({
        k: 'text', x: margin, y: h / 2 - 18, w: w - margin * 2, h: 60, text: cfg.certTitle ?? 'Certificate',
        size: 34, fill: pal.dark, weight: 'bold', align: 'center', opacity: 0.045,
    });

    // school header
    if (opts.logo !== false) {
        blocks.push({ k: 'img', x: w / 2 - 8, y: margin + 1, w: 16, h: 16, tag: 'school_logo_url' });
        blocks.push({ k: 'text', x: margin, y: margin + 18, w: w - margin * 2, h: 8, text: cfg.schoolName, size: opts.schoolSize ?? 6, weight: 'bold', align: 'center', token: 'school_name' });
    } else {
        blocks.push({ k: 'text', x: margin, y: margin, w: w - margin * 2, h: 8, text: cfg.schoolName, size: opts.schoolSize ?? 6, weight: 'bold', align: 'center', token: 'school_name' });
    }
    blocks.push({ k: 'text', x: margin, y: margin + 26, w: w - margin * 2, h: 6, text: cfg.schoolTagline ?? 'Affiliated to a State Education Board', size: 2.6, align: 'center', fill: '#64748b' });

    // top double rule under header
    const ruleY = margin + 35;
    blocks.push({ k: 'rect', x: margin + 8, y: ruleY, w: w - (margin + 8) * 2, h: 0.6, fill: pal.main });
    blocks.push({ k: 'rect', x: margin + 14, y: ruleY + 2, w: w - (margin + 14) * 2, h: 0.3, fill: pal.soft });

    // main heading
    const headingY = ruleY + 12;
    blocks.push({ k: 'text', x: margin, y: headingY, w: w - margin * 2, h: titleSize + 2, text: cfg.title, size: titleSize, weight: 'bold', align: 'center', fill: pal.dark });
    if (cfg.subtitle) {
        blocks.push({ k: 'text', x: margin, y: headingY + titleSize + 3, w: w - margin * 2, h: 7, text: cfg.subtitle, size: subSize, italic: true, align: 'center', fill: '#475569' });
    }

    // body paragraph
    if (cfg.paragraph) {
        blocks.push({ k: 'text', x: fieldX, y: headingY + titleSize + 12, w: fieldW, h: cfg.paraH ?? 18, text: cfg.paragraph, size: 3, fill: '#334155', align: 'center' });
    }

    // field grid
    const firstY = cfg.fieldsTop ?? headingY + titleSize + (cfg.paragraph ? (cfg.paraH ?? 18) + 4 : 16) + (cfg.subtitle ? 6 : 0);
    const colW = fieldW / 2;
    const rowH = opts.rowH ?? 9;
    const valueSize = opts.valueSize ?? 3.4;
    fields.forEach((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = fieldX + col * colW;
        const y = firstY + row * rowH;
        blocks.push({ k: 'text', x, y, w: colW, h: 3, text: f.label + ' :', size: 2.3, fill: pal.main, weight: 'bold' });
        blocks.push({ k: 'text', x, y: y + 3, w: colW, h: valueSize + 2, token: f.token, text: f.token, size: valueSize, weight: 'bold', fill: '#0f172a' });
    });

    return blocks;
}

// 2. top-banner: coloured header band + info panel + signature strip.
function topBanner(cfg, pal, fields, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const bandH = opts.bandH ?? (w > 150 ? 26 : 22);
    const blocks = [];
    blocks.push({ k: 'rect', x: 0, y: 0, w, h: bandH, fill: pal.main });
    blocks.push({ k: 'rect', x: 0, y: bandH, w, h: 2, fill: pal.dark });
    blocks.push({ k: 'img', x: 6, y: bandH / 2 - 7, w: 16, h: 16, tag: 'school_logo_url' });
    blocks.push({ k: 'text', x: 26, y: 3.5, w: w - 32, h: 7, text: cfg.schoolName, size: opts.schoolSize ?? 4.4, weight: 'bold', token: 'school_name', fill: '#ffffff' });
    if (cfg.schoolTagline) {
        blocks.push({ k: 'text', x: 26, y: 11, w: w - 32, h: 4, text: cfg.schoolTagline, size: 2.2, fill: '#e2e8f0' });
    }
    blocks.push({ k: 'text', x: 26, y: 16, w: w - 32, h: 5, text: cfg.title, size: opts.titleSize ?? 3.2, weight: 'bold', fill: '#fef3c7' });

    const bodyY = bandH + 8;
    blocks.push({ k: 'text', x: 10, y: bodyY, w: w - 20, h: 7, text: cfg.subtitle ?? '', size: 3.4, italic: true, fill: '#475569' });

    const colW = (w - 24) / 2;
    const rowH = opts.rowH ?? 8.5;
    fields.forEach((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 12 + col * colW;
        const y = bodyY + 10 + row * rowH;
        blocks.push({ k: 'text', x, y, w: colW, h: 3, text: f.label, size: 2.2, weight: 'bold', fill: pal.main });
        blocks.push({ k: 'text', x, y: y + 3.2, w: colW, h: 4.4, token: f.token, text: f.token, size: 3.2, weight: 'bold', fill: pal.ink });
        blocks.push({ k: 'rect', x, y: y + 8, w: colW, h: 0.3, fill: pal.soft });
    });

    return blocks;
}

// 3. id cards: photo rail and details (split mode for landscape, stacked for portrait).
function idLeftPhoto(cfg, pal, fields, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const blocks = [];
    const rail = opts.rail ?? 16;
    blocks.push({ k: 'rect', x: 0, y: 0, w, h, fill: pal.warm });
    blocks.push({ k: 'rect', x: 0, y: 0, w: rail, h, fill: pal.main });
    blocks.push({ k: 'rect', x: rail - 1, y: 0, w: 1, h, fill: pal.dark });
    blocks.push({ k: 'img', x: 6, y: 5, w: 12, h: 12, tag: 'school_logo_url' });

    blocks.push({ k: 'text', x: rail + 5, y: 4, w: w - rail - 10, h: 4.4, text: cfg.schoolName, size: 2.8, weight: 'bold', token: 'school_name', fill: pal.dark });
    blocks.push({ k: 'text', x: rail + 5, y: 9.4, w: w - rail - 10, h: 3.6, text: cfg.subtitle ?? 'Student Identity Card', size: 2, fill: pal.main, weight: 'bold' });

    if (opts.split) {
        const photoW = opts.photoW ?? 30;
        const photoH = opts.photoH ?? h - 24;
        blocks.push({ k: 'img', x: rail + 4, y: 18, w: photoW, h: photoH, tag: 'student_photo_url', frame: 'rounded' });
        const fieldX = rail + 4 + photoW + 3;
        const fieldW = w - fieldX - 4;
        const rows = Math.max(2, Math.min(opts.maxFields ?? fields.length, Math.floor((photoH - 4) / (opts.rowH ?? 7.6))));
        fields.slice(0, rows).forEach((f, i) => {
            const y = 18 + i * (opts.rowH ?? 7.6);
            blocks.push({ k: 'text', x: fieldX, y, w: fieldW, h: 2.6, text: f.label, size: 1.8, fill: '#64748b' });
            blocks.push({ k: 'text', x: fieldX, y: y + 2.7, w: fieldW, h: 3, token: f.token, text: f.token, size: 2.3, weight: 'bold', fill: pal.ink });
        });
        blocks.push({ k: 'img', x: fieldX, y: h - 14, w: 12, h: 12, tag: 'qr_code_url', frame: 'rounded' });
    } else {
        const photoH = opts.photoH ?? 16;
        const photoW = Math.min((w - rail - 10) * 0.55, 20);
        const photoX = rail + 5 + Math.max(0, ((w - rail - 10) - photoW) / 2);
        blocks.push({ k: 'img', x: photoX, y: 14, w: photoW, h: photoH, tag: 'student_photo_url', frame: 'rounded' });
        const fieldX = rail + 5;
        const fieldW = w - rail - 10;
        const startY = 14 + photoH + 2;
        const rowH = opts.rowH ?? 4.8;
        const rows = Math.max(2, Math.min(opts.maxFields ?? fields.length, Math.floor((h - startY - 2) / rowH)));
        fields.slice(0, rows).forEach((f, i) => {
            const y = startY + i * rowH;
            blocks.push({ k: 'text', x: fieldX, y, w: fieldW * 0.42, h: 2.4, text: f.label, size: 1.7, fill: '#64748b' });
            blocks.push({ k: 'text', x: fieldX + fieldW * 0.42, y, w: fieldW * 0.58, h: 2.8, token: f.token, text: f.token, size: 2.2, weight: 'bold', fill: pal.ink });
        });
    }

    return blocks;
}

// 4. marksheet-table: header + info grid + score table + signatures.
function marksheet(cfg, pal, fields, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const blocks = [];
    blocks.push({ k: 'rect', x: 0, y: 0, w, h: 9, fill: pal.main });
    blocks.push({ k: 'img', x: 6, y: 28, w: 16, h: 16, tag: 'school_logo_url' });
    blocks.push({ k: 'text', x: 26, y: 2.4, w: w - 34, h: 5.4, text: cfg.schoolName, size: 3.6, weight: 'bold', token: 'school_name', fill: '#ffffff' });
    blocks.push({ k: 'text', x: 26, y: 32, w: w - 34, h: 4, text: cfg.title, size: 3, weight: 'bold', fill: pal.main });

    const colW = (w - 20) / 2;
    const rowH = opts.rowH ?? 7;
    fields.forEach((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 10 + col * colW;
        const y = 50 + row * rowH;
        blocks.push({ k: 'text', x, y, w: colW, h: 2.6, text: f.label, size: 2.1, fill: '#64748b' });
        blocks.push({ k: 'text', x, y: y + 2.8, w: colW, h: 3.6, token: f.token, text: f.token, size: 3, weight: 'bold', fill: pal.ink });
    });

    const tableY = opts.tableY ?? (50 + Math.ceil(fields.length / 2) * rowH + 4);
    const heads = opts.heads ?? ['Subject', 'Max Marks', 'Obtained', 'Grade', 'Remark'];
    blocks.push({ k: 'grid', x: 10, y: tableY, w: w - 20, h: opts.gridH ?? 44, cols: heads.length, headH: 6, headFill: pal.main, cellH: opts.cellH ?? 7.2, heads, rows: opts.gridRows ?? 5 });

    return blocks;
}

// 5. admit-mini: compact exam credential.
function admitMini(cfg, pal, fields, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const blocks = [];
    const bandH = opts.bandH ?? 14;
    blocks.push({ k: 'rect', x: 0, y: 0, w, h, fill: '#ffffff' });
    blocks.push({ k: 'rect', x: 0, y: 0, w, h: bandH, fill: pal.main });
    blocks.push({ k: 'img', x: 3, y: 2, w: 11, h: 11, tag: 'school_logo_url' });
    blocks.push({ k: 'text', x: 16, y: 1.6, w: w - 20, h: 5, text: cfg.schoolName, size: 3.2, weight: 'bold', token: 'school_name', fill: '#ffffff' });
    blocks.push({ k: 'text', x: 16, y: 7.4, w: w - 20, h: 4, text: cfg.title, size: 2.6, weight: 'bold', fill: '#fef3c7' });
    blocks.push({ k: 'rect', x: 0, y: bandH, w, h: 0.8, fill: pal.dark });
    blocks.push({ k: 'text', x: 6, y: bandH + 5, w: w - 12, h: 4.4, text: cfg.subtitle ?? '', size: 3, italic: true, fill: '#334155' });

    const photoH = opts.photoH ?? (h > 50 ? 30 : 24);
    blocks.push({ k: 'img', x: w - 8 - (w - 14) * 0.3, y: bandH + 12, w: (w - 14) * 0.3, h: photoH, tag: 'student_photo_url', frame: 'rounded' });

    const fieldW = w - 14 - (w - 14) * 0.34;
    const rowH = opts.rowH ?? 7;
    fields.slice(0, opts.maxFields ?? 6).forEach((f, i) => {
        const y = bandH + 12 + i * rowH;
        blocks.push({ k: 'text', x: 7, y, w: fieldW * 0.45, h: 3, text: f.label, size: 2.1, fill: '#64748b' });
        blocks.push({ k: 'text', x: 7 + fieldW * 0.45, y, w: fieldW * 0.55, h: 3.4, token: f.token, text: f.token, size: 2.6, weight: 'bold', fill: pal.ink });
        blocks.push({ k: 'rect', x: 7, y: y + 3.6, w: fieldW, h: 0.25, fill: pal.soft });
    });

    return blocks;
}

// 6. interactive: modern flat card with QR + directive panel.
function interactive(cfg, pal, fields, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const blocks = [];
    blocks.push({ k: 'rect', x: 0, y: 0, w, h, fill: '#f8fafc' });
    blocks.push({ k: 'rect', x: 0, y: 0, w, h: 4, fill: pal.main });
    blocks.push({ k: 'text', x: 0, y: h - 4, w, h: 4, text: '', size: 2, fill: 'transparent' });
    blocks.push({ k: 'rect', x: w - 4, y: 0, w: 4, h, fill: pal.main });
    blocks.push({ k: 'img', x: 8, y: 8, w: 12, h: 12, tag: 'school_logo_url' });
    blocks.push({ k: 'text', x: 22, y: 9, w: w - 30, h: 5, text: cfg.schoolName, size: 3.4, weight: 'bold', token: 'school_name', fill: pal.dark });
    blocks.push({ k: 'text', x: 22, y: 15, w: w - 30, h: 4, text: cfg.title, size: 2.6, weight: 'bold', fill: pal.main });

    fields.slice(0, opts.maxFields ?? 5).forEach((f, i) => {
        const y = 34 + i * 7;
        blocks.push({ k: 'text', x: 8, y, w: (w - 32) / 2, h: 3, text: f.label, size: 2.2, fill: '#64748b' });
        blocks.push({ k: 'text', x: 8 + (w - 32) / 2, y, w: (w - 32) / 2, h: 3.4, token: f.token, text: f.token, size: 2.7, weight: 'bold', fill: pal.ink });
    });

    blocks.push({ k: 'img', x: w - 26, y: h - 40, w: 18, h: 18, tag: 'qr_code_url', frame: 'rounded' });
    blocks.push({ k: 'text', x: 8, y: h - 34, w: w - 40, h: 6, text: cfg.directive ?? 'Scan to verify this document online.', size: 2.2, opacity: 0.7, fill: '#334155' });

    return blocks;
}

// 7. watermark-single: minimal single-paragraph statement for documents.
function watermarkSingle(cfg, pal, opts = {}) {
    const w = cfg.w;
    const h = cfg.h;
    const margin = 16;
    const blocks = [];
    blocks.push({ k: 'rect', x: 4, y: 4, w: w - 8, h: h - 8, fill: '#ffffff', stroke: pal.dark, sw: 0.5 });
    blocks.push({
        k: 'text', x: margin, y: h / 2 - 20, w: w - margin * 2, h: 70, text: cfg.certTitle ?? 'Certificate',
        size: 36, fill: pal.main, weight: 'bold', align: 'center', opacity: 0.06,
    });
    blocks.push({ k: 'img', x: w / 2 - 7, y: margin + 4, w: 14, h: 14, tag: 'school_logo_url' });
    blocks.push({ k: 'text', x: margin, y: margin + 20, w: w - margin * 2, h: 7, text: cfg.schoolName, size: 5.4, weight: 'bold', align: 'center', token: 'school_name' });
    blocks.push({ k: 'rect', x: w / 2 - 18, y: margin + 28, w: 36, h: 0.6, fill: pal.main });
    blocks.push({ k: 'text', x: margin, y: margin + 34, w: w - margin * 2, h: 8.4, text: cfg.title, size: 8, weight: 'bold', align: 'center', fill: pal.dark });
    blocks.push({ k: 'text', x: margin, y: margin + 48, w: w - margin * 2, h: 20, text: cfg.paragraph ?? '', size: 3.2, align: 'center', fill: '#334155' });
    return blocks;
}

// ---------------------------------------------------------------------------
// Category recipes
// ---------------------------------------------------------------------------
const A4 = { w: 210, h: 297 };
const A5 = { w: 148, h: 210 };
const A6 = { w: 105, h: 148 };
const CR80_L = { w: 85.6, h: 54 };
const CR80_P = { w: 54, h: 85.6 };

const studentFields = [
    { label: 'Name of Student', token: 'student_name' },
    { label: 'Admission No.', token: 'admission_no' },
    { label: 'Father’s Name', token: 'father_name' },
    { label: 'Mother’s Name', token: 'mother_name' },
    { label: 'Class & Section', token: 'class_section' },
    { label: 'Date of Birth', token: 'dob' },
    { label: 'Blood Group', token: 'blood_group' },
    { label: 'Academic Session', token: 'academic_session' },
];
const documentFields = [
    { label: 'Name of Student', token: 'student_name' },
    { label: 'Admission No.', token: 'admission_no' },
    { label: 'Class & Section', token: 'class_section' },
    { label: 'Date of Birth', token: 'dob' },
    { label: 'Father’s Name', token: 'father_name' },
    { label: 'Academic Session', token: 'academic_session' },
];
const staffFields = [
    { label: 'Name of Employee', token: 'staff_name' },
    { label: 'Staff No.', token: 'staff_no' },
    { label: 'Designation', token: 'designation' },
    { label: 'Department', token: 'department' },
    { label: 'Date of Joining', token: 'academic_session' },
];
const examFields = [
    { label: 'Name of Student', token: 'student_name' },
    { label: 'Roll No.', token: 'roll_no' },
    { label: 'Class & Section', token: 'class_section' },
    { label: 'Exam Name', token: 'exam_name' },
    { label: 'Exam Session', token: 'exam_session' },
    { label: 'Dates', token: 'current_date' },
];
const receiptFields = [
    { label: 'Student Name', token: 'student_name' },
    { label: 'Admission No.', token: 'admission_no' },
    { label: 'Class & Section', token: 'class_section' },
    { label: 'Academic Session', token: 'academic_session' },
    { label: 'Guardian Name', token: 'father_name' },
    { label: 'Phone', token: 'guardian_phone' },
];

const adjectives = ['Classic', 'Modern', 'Royal', 'Fresh', 'Noble', 'Bright', 'Clean', 'Bold', 'Elegant', 'Simple', 'Premium', 'Smart', 'Vibrant', 'Serene', 'Timeless', 'Classic', 'Refined', 'Lively', 'Steady', 'Warm'];
const nounsMap = {
    certificate: ['Excellence', 'Appreciation', 'Achievement', 'Honour', 'Recognition'],
    interactive: ['Interactive Document', 'Digital Credential', 'Verified Notice', 'Smart Card', 'Online Record'],
    bonafide: ['Student Status', 'Study Confirmation', 'Enrolment Record', 'Course Standing', 'School Membership', 'Attendance Approval', 'Current Enrolment', 'Regular Student', 'Session Record'],
    character_certificate: ['Conduct Report', 'Character Reference', 'Discipline Record', 'Behaviour Summary', 'Good Standing', 'Conduct Verification', 'Moral Character', 'Student Conduct'],
    transfer_certificate: ['School Leaving', 'Transfer Record', 'Progress Transfer', 'School Change', 'Student Movement', 'Next School', 'Leaving Certificate', 'Onward Studies', 'School Release', 'Transfer Profile'],
    fee_receipt: ['Fees Paid', 'Payment Received', 'Due Settled', 'Tuition Paid', 'Receipt of Payment', 'Fee Settlement', 'Money Received', 'Payment Summary', 'Quarter Paid', 'Annual Fees', 'Installment Paid', 'Ledger Update', 'Fees Cleared', 'Balance Note', 'Term Paid'],
    id_card: ['Student Pass', 'Campus Card', 'Learner Pass', 'Hall Pass', 'Student Badge', 'Pupil Card', 'Class Pass', 'Scholar Card', 'Library Pass', 'Junior Card', 'Primary Pass', 'Cycle Permit', 'Elect ID', 'Day Scholar Card', 'Hostel Card', 'Transporter Card', 'General ID', 'Sports Card', 'Digital ID', 'Rainbow Ridge'],
    staff_id_card: ['Faculty Pass', 'Staff Badge', 'Employee Card', 'Teaching ID', 'Office Pass', 'Member Card', 'Vendor Badge', 'Support ID', 'Council Pass', 'Headmistress Card', 'Mentor Pass', 'Peer ID', 'Staff Pass'],
    marksheet: ['Term Results', 'Annual Results', 'Quarterly Report', 'Progress Report', 'Exam Results', 'Session Report', 'Half-Yearly Report', 'Assessment Card', 'Subject Report', 'Final Grade Sheet', 'Result Summary', 'Score Card', 'Performance Record', 'Term Grade Sheet', 'Unit Test Report', 'Mid Term Report', 'Yearly Report', 'Class Results', 'Batch Report', 'Consolidated Report', 'Marks Abstract', 'Grade Sheet', 'Result Card', 'Lead Sheet', 'Report Card'],
    academic: ['Academic Record'],
    general: ['General Note'],
    admit_card: ['Examination Permit', 'Test Entry Card', 'Assessment Hall Pass'],
    report_card: ['Term Report', 'Session Report Card', 'Learning Review', 'Progress Card', 'Growth Report', 'Semester Card'],
    hall_ticket: ['Board Exam Ticket', 'Final Exam Permit', 'Term Exam Ticket', 'Entrance Admit'],
    fee_challan: ['Payment Challan', 'Bank Challan', 'Due Challan', 'Installment Challan'],
    due_slip: ['Balance Reminder', 'Due Notice', 'Arrears Slip'],
    payslip: ['Monthly Pay', 'Salary Slip', 'Pay Advice'],
    hpc: ['Holistic Progress', 'Co-curricular Card', 'Overall Progress'],
    tc: ['Transfer Certificate', 'School Leaving Certificate', 'TC Application'],
    school_report: ['School Performance', 'Annual Report', 'Institution Report'],
};
const countMap = {
    academic: 1, admit_card: 3, bonafide: 9, certificate: 2, character_certificate: 8,
    fee_receipt: 15, id_card: 20, interactive: 5, marksheet: 25, staff_id_card: 13,
    transfer_certificate: 10, general: 1, report_card: 6, hall_ticket: 4,
    fee_challan: 4, due_slip: 3, payslip: 3, hpc: 3, tc: 3, school_report: 3,
};

function catTitle(cat) {
    return cat === 'school_report' ? 'School Report'
        : cat === 'hall_ticket' ? 'Hall Ticket'
        : cat === 'fee_challan' ? 'Fee Challan'
        : cat === 'due_slip' ? 'Due Slip'
        : cat === 'payslip' ? 'Payslip'
        : cat === 'staff_id_card' ? 'Staff ID Card'
        : cat === 'transfer_certificate' ? 'Transfer Certificate'
        : cat === 'character_certificate' ? 'Character Certificate'
        : cat === 'fee_receipt' ? 'Fee Receipt'
        : cat === 'admit_card' ? 'Admit Card'
        : cat === 'bonafide' ? 'Bonafide Certificate'
        : cat === 'hpc' ? 'HPC Progress Card'
        : cat === 'tc' ? 'Transfer Certificate'
        : cat === 'report_card' ? 'Report Card'
        : cat === 'certificate' ? 'Certificate'
        : cat === 'interactive' ? 'Interactive Document'
        : cat === 'id_card' ? 'Student ID Card'
        : cat === 'marksheet' ? 'Marksheet'
        : 'Certificate';
}

function buildTemplate(cat, idx, total, pal) {
    const nouns = nounsMap[cat];
    const name = `${adjectives[idx % adjectives.length]} ${nouns[idx % nouns.length]}`;
    const tp = { academic: 'completion', admit_card: 'participation', bonafide: 'completion', certificate: 'completion', character_certificate: 'completion', fee_receipt: 'completion', id_card: 'participation', interactive: 'achievement', marksheet: 'achievement', staff_id_card: 'participation', transfer_certificate: 'completion', general: 'completion', report_card: 'achievement', hall_ticket: 'participation', fee_challan: 'completion', due_slip: 'completion', payslip: 'appreciation', hpc: 'achievement', tc: 'completion', school_report: 'completion' }[cat];

    let cfg = { w: A4.w, h: A4.h, schoolName: 'Your School Name', certTitle: catTitle(cat) };
    let blocks = [];
    let back = null;
    let description = `${name} ${catTitle(cat)} design for ${pal.name} accent. Editable in the Canvas Designer.`;

    const bySkin = {
        classicCenter: () => classicCenter(cfg, pal, [null, null], {}),
    };

    switch (cat) {
        case 'certificate':
        case 'academic':
        case 'general': {
            cfg = { ...cfg, title: name };
            if (cat === 'certificate' && idx % 2 === 1) {
                blocks = watermarkSingle(cfg, pal);
            } else if (cat === 'academic') {
                cfg = { ...cfg, title: 'Academic Record', subtitle: 'Official document of study', paragraph: 'This is to certify that {{student_name}} has been enrolled at {{school_name}} for the academic session {{academic_session}}.' };
                blocks = classicCenter(cfg, pal, studentFields);
            } else {
                cfg = { ...cfg, title: name, subtitle: 'Presented with appreciation' };
                blocks = classicCenter(cfg, pal, documentFields);
            }
            break;
        }
        case 'bonafide':
        case 'character_certificate':
        case 'transfer_certificate':
        case 'tc': {
            cfg = { ...cfg, title: name };
            if (cat === 'character_certificate') {
                cfg.subtitle = 'Character Reference';
                blocks = classicCenter(cfg, pal, documentFields.slice(0, 6), { rowH: 10 });
            } else if (cat === 'bonafide') {
                cfg.subtitle = 'Bonafide Certificate';
                blocks = classicCenter(cfg, pal, cat === 'bonafide' && idx % 3 === 2 ? documentFields : studentFields, { rowH: 9 });
            } else {
                cfg.subtitle = 'Transfer / Leaving Certificate';
                blocks = classicCenter(cfg, pal, studentFields, { rowH: 9 });
            }
            break;
        }
        case 'fee_receipt':
        case 'fee_challan':
        case 'due_slip': {
            cfg = { ...cfg, w: A5.w, h: A5.h, title: name, schoolTagline: 'Fee Department' };
            if (cat === 'due_slip') {
                blocks = topBanner(cfg, pal, receiptFields.slice(0, 5), { rowH: 9 });
            } else {
                blocks = topBanner(cfg, pal, receiptFields, { rowH: 8.5 });
            }
            break;
        }
        case 'payslip': {
            cfg = { ...cfg, w: A5.w, h: A5.h, title: name, schoolTagline: 'Staff Payroll' };
            blocks = marksheet(cfg, pal, staffFields, { heads: ['Earning', 'Amount', 'Deduction', 'Amount'], tableY: 92, gridRows: 4, cellH: 7.6, gridH: 38 });
            break;
        }
        case 'id_card':
        case 'staff_id_card': {
            const landscape = idx % 4 < 2;
            cfg = { ...cfg, w: landscape ? CR80_L.w : CR80_P.w, h: landscape ? CR80_L.h : CR80_P.h };
            cfg.title = cat === 'staff_id_card' ? 'Staff Identity Card' : 'Student Identity Card';
            const fields = cat === 'staff_id_card' ? staffFields.slice(0, 5) : studentFields.slice(0, 6);
            const photoToken = cat === 'staff_id_card' ? 'staff_photo_url' : 'student_photo_url';
            blocks = idLeftPhoto(cfg, pal, fields, landscape ? { split: true, maxFields: 6 } : { maxFields: 4 });
            blocks = blocks.map((b) => (b.tag === 'student_photo_url' || b.tag === 'staff_photo_url' ? { ...b, tag: photoToken } : b));
            back = idBack(cfg, pal, cat === 'staff_id_card' ? 'Staff' : 'Student');
            description = `${name} ${cat === 'staff_id_card' ? 'staff' : 'student'} identity card (${landscape ? 'landscape' : 'portrait'}).`;
            break;
        }
        case 'admit_card':
        case 'hall_ticket': {
            const portrait = cat === 'hall_ticket' ? idx % 2 === 0 : idx % 2 === 1;
            cfg = { ...cfg, w: portrait ? A5.w : A6.w, h: portrait ? A5.h : A6.h, title: catTitle(cat) };
            blocks = admitMini(cfg, pal, examFields, { maxFields: 6 });
            break;
        }
        case 'marksheet':
        case 'report_card':
        case 'hpc': {
            cfg = { ...cfg, w: A4.w, h: A4.h, title: catTitle(cat) };
            if (cat === 'hpc') {
                blocks = marksheet(cfg, pal, studentFields.slice(0, 6), { heads: ['Attribute', 'Rating', 'Observation'], tableY: 96, gridRows: 6, cellH: 8, gridH: 50 });
            } else if (cat === 'report_card') {
                blocks = marksheet(cfg, pal, studentFields.slice(0, 8), { gridRows: 6, cellH: 7.4 });
            } else {
                blocks = marksheet(cfg, pal, studentFields.slice(0, 8));
            }
            break;
        }
        case 'interactive': {
            cfg = { ...cfg, w: A5.w, h: A5.h, title: name, directive: 'Point your camera at the QR code to verify this document instantly.' };
            blocks = interactive(cfg, pal, studentFields.slice(0, 5), { maxFields: 5 });
            break;
        }
    }

    const content = toHtml(blocks, cfg.w, cfg.h);

    return {
        title: `${name} (${pal.name})`.trim(),
        category: cat,
        type: tp,
        description,
        editor_type: 'fabric',
        content,
        content_json: toFabric(blocks, cfg.w, cfg.h),
        back_content: back ? toHtml(back, cfg.w, cfg.h) : null,
        back_content_json: back ? toFabric(back, cfg.w, cfg.h) : null,
        thumbnail_data: toSvgThumb(content, cfg.w, cfg.h),
        card_width_mm: cfg.w,
        card_height_mm: cfg.h,
    };
}

// back side for ID cards — QR + instructions + address band
function idBack(cfg, pal, holder) {
    const w = cfg.w;
    const h = cfg.h;
    const blocks = [];
    blocks.push({ k: 'rect', x: 0, y: 0, w, h, fill: pal.warm });
    blocks.push({ k: 'rect', x: 0, y: 0, w, h: 8, fill: pal.main });
    blocks.push({ k: 'text', x: 0, y: 1.8, w, h: 4, text: `${holder} Identity Card`, size: 3, weight: 'bold', align: 'center', fill: '#ffffff' });
    blocks.push({ k: 'img', x: w / 2 - 12, y: 14, w: 24, h: 24, tag: 'qr_code_url', frame: 'rounded' });
    blocks.push({ k: 'text', x: 6, y: h - 24, w: w - 12, h: 6, text: 'If found, please return this card to the school office.', size: 1.8, italic: true, align: 'center', fill: '#64748b' });
    blocks.push({ k: 'rect', x: 0, y: h - 6, w, h: 6, fill: pal.main });
    return blocks;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

let summary = {};
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const cat of Object.keys(countMap)) {
    const count = countMap[cat];
    const dir = path.join(OUT, cat);
    fs.mkdirSync(dir, { recursive: true });
    let written = 0;
    for (let i = 0; i < count; i++) {
        const pal = PALETTES[(i * 3 + Math.floor(i / count)) % PALETTES.length];
        const asset = buildTemplate(cat, i, count, pal);
        const file = path.join(dir, `${slugify(asset.title)}.json`);
        fs.writeFileSync(file, JSON.stringify(asset, null, 2));
        written++;
    }
    summary[cat] = written;
}
console.log(JSON.stringify(summary, null, 2));
console.log('Total assets:', Object.values(summary).reduce((a, b) => a + b, 0));