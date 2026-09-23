import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    Canvas,
    FabricText,
    Textbox,
    Rect,
    Circle,
    Triangle,
    Polygon,
    Path,
    Image,
    Shadow,
    Gradient,
    Group,
    Object as FabricRuntimeObject,
    type IText,
    type Object as FabricObject,
} from 'fabric';
import { useLanguage } from '../../i18n/LanguageProvider';
import DashboardLayout from '../DashboardLayout';

// Fabric 6 only serialises a fixed set of properties; `name` is how the designer
// tags photo frames (`name: token:...`), import placeholders and variables, so it
// must survive every save -> loadFromJSON round trip.
try {
    (FabricRuntimeObject as any).customProperties = (FabricRuntimeObject as any).customProperties ?? [];
    if (!(FabricRuntimeObject as any).customProperties.includes('name'))
        (FabricRuntimeObject as any).customProperties.push('name');
    if (!(FabricRuntimeObject as any).customProperties.includes('tokenText'))
        (FabricRuntimeObject as any).customProperties.push('tokenText');
    for (const p of NOTE_CUSTOM_PROPS) {
        if (!(FabricRuntimeObject as any).customProperties.includes(p)) (FabricRuntimeObject as any).customProperties.push(p);
    }
} catch {
    // non-fatal: without name persistence the premium placeholders still render
}
import {
    AlignCenter,
    AlignCenterVertical,
    AlignEndVertical,
    AlignLeft,
    AlignRight,
    AlignStartVertical,
    ArrowDownToLine,
    ArrowUpToLine,
    Asterisk,
    Bold,
    ChevronsLeft,
    ChevronsRight,
    Copy,
    Eye,
    EyeOff,
    FileText,
    Hand,
    Image as ImageIcon,
    Italic,
    Layers,
    List,
    Lock,
    Magnet,
    Maximize2,
    MoveHorizontal,
    MoveVertical,
    Palette,
    Redo2,
    RefreshCcw,
    Ruler,
    Save,
    Scan,
    SlidersHorizontal,
    Square,
    SquareSplitHorizontal,
    Text as TextIcon,
    Trash2,
    Type,
    Undo2,
    Underline,
    Unlock,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import {
    type PlaceholderGroup,
    type TemplateDesignSummary,
    substituteTokensInText,
    twinPreviewDocWithSamples,
} from '../../components/designer/templateTypes';
import { objectsFromHtml } from '../../components/designer/fromHtml';
import {
    DEFAULT_NOTE_META,
    NOTE_CUSTOM_PROPS,
    htmlFromPlain,
    makeNoteGroup,
    measureNoteHeightPx,
    metaFromGroup,
    noteChildren,
    noteGroupOf,
    noteName,
    plainFromHtml,
    sanitizeNoteHtml,
    setNoteMeta,
    type NoteMeta,
    type NoteGeometry,
} from '../../components/designer/noteCard';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

const PX_PER_MM = 96 / 25.4;

type Side = 'front' | 'back';

interface Hist {
    undo: CanvasJson[];
    redo: CanvasJson[];
}

interface CanvasDesignerProps {
    user: any;
    schoolName: string;
    template: TemplateDesignSummary | null;
    categories: { key: string; label: string }[];
    cardSizePresets: Record<string, [number, number] | null>;
    cardWidthMm: number;
    cardHeightMm: number;
    placeholderGroups: PlaceholderGroup[];
    standins: { avatar: string; qr: string; logo: string };
    samples: { photo: string; logo: string };
    editorTypes: string[];
}

interface CanvasJson {
    objects: any[];
    [key: string]: unknown;
}

type ShapeOpts = Record<string, unknown>;

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact'];

const SHAPES: { key: string; label: string; cat: string; build: () => ShapeOpts }[] = [
    { key: 'rounded-box', label: 'Rounded box', cat: 'Basic', build: () => ({ left: 0, top: 0, width: 48, height: 36, rx: 8, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'rect', label: 'Rectangle', cat: 'Basic', build: () => ({ left: 0, top: 0, width: 48, height: 36, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'triangle', label: 'Triangle', cat: 'Basic', build: () => ({ sideWidth: 40, sideHeight: 40, left: 0, top: 0, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'diamond', label: 'Diamond', cat: 'Basic', build: () => ({ points: [{x: 20, y: 0}, {x: 40, y: 20}, {x: 20, y: 40}, {x: 0, y: 20}], left: 0, top: 0, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'pentagon', label: 'Pentagon', cat: 'Basic', build: () => ({ points: rgPoints(5, 16, -Math.PI / 2), left: 0, top: 0, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'hexagon', label: 'Hexagon', cat: 'Basic', build: () => ({ points: rgPoints(6, 16, 0), left: 0, top: 0, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'arrow', label: 'Arrow →', cat: 'Basic', build: () => ({ points: [{x:0,y:6},{x:22,y:6},{x:22,y:0},{x:34,y:12},{x:22,y:24},{x:22,y:18},{x:0,y:18}], left: 0, top: 0, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'chevron', label: 'Chevron', cat: 'Basic', build: () => ({ points: [{x:0,y:0},{x:14,y:0},{x:22,y:10},{x:14,y:20},{x:0,y:20},{x:8,y:10}], left: 0, top: 0, fill: '#4f46e5' }) as ShapeOpts },
    { key: 'star', label: 'Star', cat: 'Basic', build: () => ({ points: starPoints(5, 18, 8), left: 0, top: 0, fill: '#f59e0b' }) as ShapeOpts },
    { key: 'shield', label: 'Shield', cat: 'Badges & seals', build: () => ({ d: 'M20 0 L38 6 L38 20 C38 34 20 40 20 40 C20 40 2 34 2 20 L2 6 Z', left: 0, top: 0, fill: '#059669' }) as ShapeOpts },
    { key: 'seal', label: 'Award seal', cat: 'Badges & seals', build: () => ({ d: 'M16 0 C24 2 38 8 40 20 C38 32 24 38 16 40 C8 38 -6 32 -8 20 C-6 8 8 2 16 0', left: 0, top: 0, fill: '#7c3aed' }) as ShapeOpts },
    { key: 'burst', label: 'Starburst', cat: 'Badges & seals', build: () => ({ points: burstPoints(16, 15, 4), left: 0, top: 0, fill: '#dc2626' }) as ShapeOpts },
    { key: 'heart', label: 'Heart', cat: 'Fun', build: () => ({ d: 'M20 32 C14 26 0 20 0 10 C0 3 6 -2 12 1 C17 4 19 7 20 9 C21 7 23 4 28 1 C34 -2 40 3 40 10 C40 20 26 26 20 32 Z', left: 0, top: 0, fill: '#db2777' }) as ShapeOpts },
    { key: 'line', label: 'Line', cat: 'Lines', build: () => ({ left: 0, top: 0, width: 60, height: 2, fill: '#111827' }) as ShapeOpts },
];

function rgPoints(sides: number, r: number, rot: number) {
    return Array.from({ length: sides }, (_, i) => {
        const a = rot + (i * 2 * Math.PI) / sides;
        return { x: r + r * Math.cos(a), y: r + r * Math.sin(a) };
    });
}
function starPoints(points: number, outer: number, inner: number) {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        pts.push({ x: outer + r * Math.cos(a), y: outer + r * Math.sin(a) });
    }
    return pts;
}
function burstPoints(n: number, outer: number, inner: number) {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i * Math.PI) / n;
        pts.push({ x: outer + r * Math.cos(a), y: outer + r * Math.sin(a) });
    }
    return pts;
}

const PHOTO_FRAMES = ['rounded', 'circle', 'hexagon', 'arch'] as const;

const PRESET_LABELS: Record<string, string> = {
    cr80_portrait: 'ID card · CR80 portrait',
    cr80_landscape: 'ID card · CR80 landscape',
    a7_portrait: 'A7 portrait',
    a7_landscape: 'A7 landscape',
    a6_portrait: 'A6 portrait',
    a6_landscape: 'A6 landscape',
    a5_portrait: 'A5 portrait',
    a5_landscape: 'A5 landscape',
    a4_portrait: 'A4 portrait',
    a4_landscape: 'A4 landscape',
    a3_portrait: 'A3 portrait',
    a3_landscape: 'A3 landscape',
    custom: 'Custom',
};

function presetLabel(key: string): string {
    return PRESET_LABELS[key] ?? key.replace(/_/g, ' ');
}

/**
 * Figure out which named preset (if any) matches a width×height in mm so the
 * preset selector always reports the template's real size instead of a
 * hard-coded default.
 */
function matchPreset(wMm: number, hMm: number, presets: Record<string, [number, number] | null>): string {
    const tol = 0.9;
    for (const [key, size] of Object.entries(presets)) {
        if (size && Math.abs(size[0] - wMm) <= tol && Math.abs(size[1] - hMm) <= tol) return key;
    }
    return 'custom';
}

/** Human-friendly type name shown in the selection header / layers list. */
function friendlyType(o: FabricObject | null | undefined): string {
    if (!o) return 'Object';
    const name = String((o as { name?: unknown }).name ?? '');
    const type = String(o.type ?? '').toLowerCase();
    if (name.startsWith('placeholder:')) return 'Variable';
    if (name.startsWith('token:')) return 'Image placeholder';
    if (name.startsWith('note:')) return 'Note card';
    if (['textbox', 'i-text', 'text'].includes(type)) return 'Text';
    if (type === 'image') return 'Photo';
    if (type === 'rect') return 'Rectangle';
    if (type === 'circle' || type === 'ellipse') return 'Circle';
    if (type === 'triangle') return 'Triangle';
    if (type === 'line') return 'Line';
    if (type === 'group') return 'Group';
    if (type === 'polygon') return 'Polygon';
    if (type === 'path') return name.toLowerCase().includes('seal') ? 'Seal' : 'Shape';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Scale a serialized canvas (plain JSON) uniformly about the top-left origin and
 * then translate it. Group children inherit the parent's scale, so only the
 * top-level objects need to be touched to keep geometry exact through a
 * loadFromJSON round trip.
 */
function rescaleJsonObjects(jsonArr: unknown[] | undefined, k: number, dx: number, dy: number): void {
    if (!Array.isArray(jsonArr)) return;
    for (const o of jsonArr) {
        if (!o || typeof o !== 'object') continue;
        const obj = o as Record<string, unknown>;
        obj.left = ((obj.left as number) ?? 0) * k + dx;
        obj.top = ((obj.top as number) ?? 0) * k + dy;
        obj.scaleX = ((obj.scaleX as number) ?? 1) * k;
        obj.scaleY = ((obj.scaleY as number) ?? 1) * k;
        if (typeof obj.strokeWidth === 'number') obj.strokeWidth = (obj.strokeWidth as number) * k;
        if (typeof obj.rx === 'number') obj.rx = (obj.rx as number) * k;
        if (typeof obj.ry === 'number') obj.ry = (obj.ry as number) * k;
    }
}

/** Axis-aligned bounds of serialized objects (origin + rotation aware). */
function jsonContentBounds(jsonArr: unknown[] | undefined): { left: number; top: number; right: number; bottom: number } {
    let L = Infinity;
    let T = Infinity;
    let R = -Infinity;
    let B = -Infinity;
    if (Array.isArray(jsonArr)) {
        for (const o of jsonArr) {
            if (!o || typeof o !== 'object') continue;
            const obj = o as Record<string, number | string>;
            const w = Math.abs((obj.width as number ?? 0) * (obj.scaleX as number ?? 1));
            const h = Math.abs((obj.height as number ?? 0) * (obj.scaleY as number ?? 1));
            const ox = obj.originX;
            const oy = obj.originY;
            let ex = obj.left as number ?? 0;
            let ey = obj.top as number ?? 0;
            if (ox === 'center') ex -= w / 2;
            else if (ox === 'right') ex -= w;
            if (oy === 'center') ey -= h / 2;
            else if (oy === 'bottom') ey -= h;
            const a = (((obj.angle as number) ?? 0) * Math.PI) / 180;
            const cx = ex + w / 2;
            const cy = ey + h / 2;
            for (const [px, py] of [
                [ex, ey],
                [ex + w, ey],
                [ex, ey + h],
                [ex + w, ey + h],
            ]) {
                let x = px;
                let y = py;
                if (a) {
                    x = cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a);
                    y = cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a);
                }
                if (x < L) L = x;
                if (x > R) R = x;
                if (y < T) T = y;
                if (y > B) B = y;
            }
        }
    }
    if (L === Infinity) return { left: 0, top: 0, right: 0, bottom: 0 };
    return { left: L, top: T, right: R, bottom: B };
}

const SWATCHES = [
    '#111827', '#374151', '#6b7280', '#9ca3af', '#f9fafb',
    '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0d9488',
    '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#e11d48', '#78350f',
];

export default function CanvasDesigner(pageProps: CanvasDesignerProps) {
    const { t } = useLanguage();
    const user = pageProps.user;
    const existing = pageProps.template ?? null;
    const categories = pageProps.categories ?? [];
    const presets = pageProps.cardSizePresets ?? {};
    const placeholderGroups = pageProps.placeholderGroups ?? [];
    const standins = pageProps.standins;

    const [name, setName] = useState(existing?.title ?? '');
    const [category, setCategory] = useState(existing?.category ?? categories[0]?.key ?? 'certificate');
    const [cardW, setCardW] = useState<number>(pageProps.cardWidthMm ?? 54);
    const [cardH, setCardH] = useState<number>(pageProps.cardHeightMm ?? 85.6);
    const [preset, setPreset] = useState<string>(() =>
        matchPreset(pageProps.cardWidthMm ?? 54, pageProps.cardHeightMm ?? 85.6, pageProps.cardSizePresets ?? {}),
    );
    const [side, setSide] = useState<Side>('front');
    const [selected, setSelected] = useState<FabricObject | null>(null);
    const [undoLen, setUndoLen] = useState(0);
    const [redoLen, setRedoLen] = useState(0);
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(true);
    const [varQuery, setVarQuery] = useState('');
    const [leftTab, setLeftTab] = useState<'text' | 'var' | 'shapes' | 'photos'>('var');
    const [rightTab, setRightTab] = useState<'props' | 'layers' | 'page'>('props');
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [showRulers, setShowRulers] = useState(true);
    const [showGuides, setShowGuides] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
    const [dragGuide, setDragGuide] = useState<{ axis: 'v' | 'h'; pos: number; idx: number | null } | null>(null);
    const [snapLines, setSnapLines] = useState<{ axis: 'x' | 'y'; pos: number }[]>([]);
    const dragGuideRef = useRef<{ axis: 'v' | 'h'; pos: number; idx: number | null } | null>(null);
    dragGuideRef.current = dragGuide;
    const [layerVersion, setLayerVersion] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [pvSide, setPvSide] = useState<Side>('front');
    const [win, setWin] = useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight });

    // A bump in `bootToken` (or a change of page size) tears the fabric canvases
    // down and re-creates them at the new backing size using the content in
    // `bootSourceRef` instead of the props (used when the user changes the page
    // size mid-session and the existing content must be kept, rescaled).
    const [bootToken, setBootToken] = useState(0);
    const bootSourceRef = useRef<{
        front: CanvasJson | null;
        back: CanvasJson | null;
        twinFront: string | null;
        twinBack: string | null;
    } | null>(null);
    // Serialises page resizes: the busy overlay is not interactive, so this
    // guards against a stray second event capturing a mid-boot (empty) canvas.
    const resizeLockRef = useRef(false);

    const [pgW, setPgW] = useState<number>(pageProps.cardWidthMm ?? 54);
    const [pgH, setPgH] = useState<number>(pageProps.cardHeightMm ?? 85.6);
    useEffect(() => {
        setPgW(cardW);
        setPgH(cardH);
    }, [cardW, cardH]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const canvases = useRef<{ front: Canvas | null; back: Canvas | null }>({ front: null, back: null });
    const history = useRef<{ front: Hist; back: Hist }>({
        front: { undo: [], redo: [] },
        back: { undo: [], redo: [] },
    });
    const lockRef = useRef(false);
    const layerIdsRef = useRef(new WeakMap<object, number>());
    const layerCounterRef = useRef(0);
    const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noteEditorRef = useRef<HTMLDivElement | null>(null);
    const noteMetaRef = useRef<NoteMeta | null>(null);

    const layerId = (o: object): number => {
        const existing = layerIdsRef.current.get(o);
        if (existing !== undefined) return existing;
        layerCounterRef.current += 1;
        layerIdsRef.current.set(o, layerCounterRef.current);
        return layerCounterRef.current;
    };

    const pxW = useMemo(() => Math.round(cardW * PX_PER_MM), [cardW]);
    const pxH = useMemo(() => Math.round(cardH * PX_PER_MM), [cardH]);

    const active = () => canvases.current[side];

    const ZOOM_MIN = 0.1;
    const ZOOM_MAX = 8;

    // CSS-only viewport. The fabric backing buffers stay fixed at the page's
    // pixel size (pxW x pxH) for the whole session; zoom + pan are pure CSS
    // transforms on the stage wrapper, so fabric 6 (which compensates pointers
    // by `upperCanvasEl.width / boundsRect.width`) keeps hit-testing, dragging
    // and selection exact at every scale, and `toDataURL` thumbnails always
    // render the full page at identity.
    const zoomRef = useRef(1);
    const viewRef = useRef({ s: 1, x: 0, y: 0 });
    const [view, setView] = useState({ s: 1, x: 0, y: 0 });
    const [stage, setStage] = useState({ cw: Math.max(320, window.innerWidth - 576), ch: Math.max(240, window.innerHeight - 56) });
    const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
    const [zoomInput, setZoomInput] = useState('100');
    const [panMode, setPanMode] = useState<'off' | 'space' | 'hand'>('off');
    const spaceRef = useRef(false);
    const panDrag = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);

    useEffect(() => {
        zoomRef.current = view.s;
        viewRef.current = view;
    }, [view]);

    const zoomPct = Math.round(view.s * 100);

    const stageSize = useCallback((): { cw: number; ch: number } => {
        const el = viewportRef.current;
        return el ? { cw: el.clientWidth, ch: el.clientHeight } : { cw: stage.cw || pxW, ch: stage.ch || pxH };
    }, [stage.cw, stage.ch, pxW, pxH]);

    const clampZoom = useCallback((z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)), []);

    // Zoom about a point given in container coordinates (mx, my). The page
    // point under (mx, my) stays fixed on screen across the scale change.
    const anchorZoom = useCallback(
        (factor: number, mx: number, my: number) => {
            const { cw, ch } = stageSize();
            setView((v) => {
                const s = clampZoom(v.s * factor);
                if (s === v.s) return v;
                const cx = (cw - pxW * v.s) / 2;
                const cy = (ch - pxH * v.s) / 2;
                const pageX = (mx - (cx + v.x)) / v.s;
                const pageY = (my - (cy + v.y)) / v.s;
                const cx2 = (cw - pxW * s) / 2;
                const cy2 = (ch - pxH * s) / 2;
                return { s, x: mx - cx2 - pageX * s, y: my - cy2 - pageY * s };
            });
        },
        [pxW, pxH, stageSize, clampZoom],
    );

    const applyZoom = useCallback(
        (targetZ: number) => {
            const { cw, ch } = stageSize();
            const z = clampZoom(targetZ);
            const current = viewRef.current;
            if (z === current.s) {
                setView({ s: z, x: 0, y: 0 });
                return;
            }
            setView((v) => {
                const factor = z / v.s;
                const cx = (cw - pxW * v.s) / 2;
                const cy = (ch - pxH * v.s) / 2;
                const mx = cw / 2;
                const my = ch / 2;
                const pageX = (mx - (cx + v.x)) / v.s;
                const pageY = (my - (cy + v.y)) / v.s;
                const cx2 = (cw - pxW * z) / 2;
                const cy2 = (ch - pxH * z) / 2;
                return { s: z, x: mx - cx2 - pageX * z, y: my - cy2 - pageY * z };
            });
        },
        [pxW, pxH, stageSize, clampZoom, viewRef],
    );

    const fitZoom = useCallback(() => {
        const { cw, ch } = stageSize();
        const zoom = clampZoom(Math.min((cw - 56) / pxW, (ch - 96) / pxH, 1.5));
        setView({ s: zoom, x: 0, y: 0 });
    }, [pxW, pxH, stageSize, clampZoom]);

    const zoomBy = useCallback(
        (dir: 1 | -1) => {
            const { cw, ch } = stageSize();
            anchorZoom(dir === 1 ? 1.2 : 1 / 1.2, cw / 2, ch / 2);
        },
        [anchorZoom, stageSize],
    );

    const zoomToSelection = useCallback(() => {
        const c = active();
        const obj = c?.getActiveObject();
        if (!c || !obj) return;
        const r = obj.getBoundingRect();
        if (!r.width || !r.height) return;
        const pad = 64;
        const { cw, ch } = stageSize();
        const s = clampZoom(Math.min((cw - pad * 2) / r.width, (ch - pad * 2) / r.height, 1.5));
        const cx = (cw - pxW * s) / 2;
        const cy = (ch - pxH * s) / 2;
        const cX = r.left + r.width / 2;
        const cY = r.top + r.height / 2;
        setView({ s, x: cw / 2 - cx - cX * s, y: ch / 2 - cy - cY * s });
    }, [active, clampZoom, pxW, pxH, stageSize]);

    const panBy = useCallback((dx: number, dy: number) => {
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }, []);

    const gravityRef = useRef({ snap: true, guides: true });
    useEffect(() => {
        gravityRef.current = { snap: snapEnabled, guides: showGuides };
    }, [snapEnabled, showGuides]);
    const guidesStateRef = useRef(guides);
    useEffect(() => {
        guidesStateRef.current = guides;
    }, [guides]);
    const snapLinesRef = useRef<{ axis: 'x' | 'y'; pos: number }[]>([]);

    const pageFromClient = useCallback(
        (axis: 'v' | 'h', clientX: number, clientY: number) => {
            const el = viewportRef.current;
            if (!el) return 0;
            const rect = el.getBoundingClientRect();
            const mx = clientX - rect.left;
            const my = clientY - rect.top;
            const v = viewRef.current;
            const stageLeft = (stage.cw - pxW * v.s) / 2 + v.x;
            const stageTop = (stage.ch - pxH * v.s) / 2 + v.y;
            return axis === 'v' ? (mx - stageLeft) / v.s : (my - stageTop) / v.s;
        },
        [pxW, pxH, stage.cw, stage.ch],
    );

    // Snap an object being moved or scaled to the page edges/centre, guides and
    // (when moving) the edges/centres of sibling objects. Adjustments are applied
    // directly to the drag target's properties; matching snap positions are echoed
    // as temporary indicator lines until the pointer is released.
    const applySnap = useCallback(
        (canvasLocal: Canvas, obj: FabricObject, mode: 'move' | 'scale') => {
            const cfg = gravityRef.current;
            if (!cfg.snap) return;
            const tol = 6 / Math.max(zoomRef.current, 0.1);
            // Use the live transform (already committed for this frame) rather
            // than getBoundingRect(), which lags one frame behind during drags
            // and would turn every snap into an overshoot.
            const w = Math.abs(obj.width ?? 0) * (obj.scaleX ?? 1);
            const h = Math.abs(obj.height ?? 0) * (obj.scaleY ?? 1);
            const left = obj.left ?? 0;
            const top = obj.top ?? 0;
            const cx = left + w / 2;
            const cy = top + h / 2;
            const rx = left + w;
            const by = top + h;

            const xc: number[] = [0, pxW / 2, pxW];
            const yc: number[] = [0, pxH / 2, pxH];
            if (cfg.guides) {
                for (const g of guidesStateRef.current.v) xc.push(g);
                for (const g of guidesStateRef.current.h) yc.push(g);
            }
            if (mode === 'move') {
                const toB = (o: FabricObject) => {
                    const ow = Math.abs(o.width ?? 0) * (o.scaleX ?? 1);
                    const oh = Math.abs(o.height ?? 0) * (o.scaleY ?? 1);
                    const ol = o.left ?? 0;
                    const ot = o.top ?? 0;
                    return { l: ol, c: ol + ow / 2, r: ol + ow, t: ot, m: ot + oh / 2, b: ot + oh };
                };
                for (const other of canvasLocal.getObjects()) {
                    if (other === obj || other.excludeFromExport) continue;
                    const b = toB(other);
                    xc.push(b.l, b.c, b.r);
                    yc.push(b.t, b.m, b.b);
                }
            }

            const fit = (goal: number, cands: number[]) => {
                let best: number | null = null;
                let bd = tol;
                for (const c of cands) {
                    const d = Math.abs(c - goal);
                    if (d <= bd) {
                        bd = d;
                        best = c;
                    }
                }
                return best;
            };

            const lines: { axis: 'x' | 'y'; pos: number }[] = [];
            const investigate = (anchors: [number, number, number], axis: 'x' | 'y') => {
                let best: number | null = null;
                let bd = tol;
                let ba = 0;
                const cands = axis === 'x' ? xc : yc;
                anchors.forEach((goal, i) => {
                    const c = fit(goal, cands);
                    if (c !== null && Math.abs(c - goal) <= bd) {
                        bd = Math.abs(c - goal);
                        best = c;
                        ba = i;
                    }
                });
                if (best === null) return;
                const delta = best - anchors[ba];
                if (axis === 'x') {
                    if (ba === 2 && mode === 'scale') {
                        const ow = Math.max(Math.abs(obj.width ?? 1), 1);
                        obj.set('scaleX', (obj.scaleX ?? 1) + delta / ow);
                    } else {
                        obj.set('left', left + delta);
                    }
                } else {
                    if (ba === 2 && mode === 'scale') {
                        const oh = Math.max(Math.abs(obj.height ?? 1), 1);
                        obj.set('scaleY', (obj.scaleY ?? 1) + delta / oh);
                    } else {
                        obj.set('top', top + delta);
                    }
                }
                lines.push({ axis, pos: best });
            };

            investigate([left, cx, rx], 'x');
            investigate([top, cy, by], 'y');

            if (lines.length) {
                const prev = snapLinesRef.current;
                const same =
                    prev.length === lines.length &&
                    prev.every((p, i) => p.axis === lines[i].axis && Math.abs(p.pos - lines[i].pos) < 0.01);
                if (!same) {
                    snapLinesRef.current = lines;
                    setSnapLines(lines);
                }
            }
        },
        [pxW, pxH],
    );

    const snapshot = useCallback(
        (c: Canvas, sideKey?: Side) => {
            if (lockRef.current) return;
            const sk = sideKey ?? side;
            const hist = history.current[sk];
            const json = c.toJSON() as CanvasJson;
            hist.undo.push(json);
            if (hist.undo.length > 40) hist.undo.shift();
            hist.redo = [];
            setUndoLen(hist.undo.length);
            setRedoLen(0);
            setLayerVersion((v) => v + 1);
        },
        [side],
    );

    const clearHistory = useCallback((sideKey: Side) => {
        history.current[sideKey].undo = [];
        history.current[sideKey].redo = [];
        setUndoLen(0);
        setRedoLen(0);
    }, []);

    /**
     * Change the page size and rebuild both canvases at the new backing size.
     * The existing design is scaled uniformly (keeping proportions — no
     * stretching, so nothing overlaps or skews) around the old content and
     * re-centred in the new page, then both canvases are re-created. This is the
     * only path that mutates `cardW/cardH`, so the size that is saved always
     * matches what the content actually occupies.
     */
    const applyPageSize = useCallback(
        (wMmIn: number, hMmIn: number) => {
            if (resizeLockRef.current) return;
            const wMm = Math.max(20, Math.min(600, Number(wMmIn) || 54));
            const hMm = Math.max(20, Math.min(600, Number(hMmIn) || 85.6));
            const nw = Math.round(wMm * PX_PER_MM);
            const nh = Math.round(hMm * PX_PER_MM);
            setPreset(matchPreset(wMm, hMm, presets));
            if (nw === pxW && nh === pxH) {
                setPgW(cardW);
                setPgH(cardH);
                return;
            }
            resizeLockRef.current = true;
            const rescale = (c: Canvas | null): CanvasJson | null => {
                if (!c) return null;
                const json = c.toJSON() as CanvasJson;
                const before = jsonContentBounds(json.objects);
                const bw = Math.max(before.right - before.left, 1);
                const bh = Math.max(before.bottom - before.top, 1);
                const pad = PX_PER_MM * 2;
                const k = Math.min((nw - pad) / bw, (nh - pad) / bh, 1);
                rescaleJsonObjects(json.objects, k, 0, 0);
                const after = jsonContentBounds(json.objects);
                const dx = nw / 2 - (after.left + after.right) / 2;
                const dy = nh / 2 - (after.top + after.bottom) / 2;
                rescaleJsonObjects(json.objects, 1, dx, dy);
                return json;
            };
            bootSourceRef.current = {
                front: rescale(canvases.current.front),
                back: rescale(canvases.current.back),
                twinFront: null,
                twinBack: null,
            };
            setSelected(null);
            setBusy(true);
            setCardW(wMm);
            setCardH(hMm);
            setBootToken((t) => t + 1);
        },
        [pxW, pxH, cardW, cardH, presets],
    );

    /** Set the page background colour for the current side and persist it. */
    const setPageBg = useCallback(
        (color: string) => {
            const value = /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#ffffff';
            const c = canvases.current[side];
            if (!c) return;
            (c as unknown as { backgroundColor: string }).backgroundColor = value;
            c.requestRenderAll();
            snapshot(c);
        },
        [side, snapshot],
    );

    /** Shrink a design that overflows its page edges so it fits with a 4mm margin. */
    const fitContentToPage = useCallback(() => {
        const c = canvases.current[side];
        if (!c) return;
        const objects = c.getObjects();
        if (!objects.length) return;
        const pad = PX_PER_MM * 4;
        const { maxX, maxY } = contentBounds(objects);
        const k = Math.min((pxW - pad) / Math.max(maxX, 1), (pxH - pad) / Math.max(maxY, 1), 1);
        if (k < 1) {
            scaleObjectsToFit(objects, k);
            const { maxX: sX, maxY: sY } = contentBounds(objects);
            const dx = (pxW - sX) / 2;
            const dy = (pxH - sY) / 2;
            for (const obj of objects) {
                obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
                obj.setCoords();
            }
            c.requestRenderAll();
            snapshot(c);
        }
    }, [side, pxW, pxH, snapshot]);

    // ---- Note card ---------------------------------------------------------
    // Rebuild the group from authoritative metadata at an absolute box, keeping
    // layer index / selection / transforms / lock state. Children are rebuilt so
    // auto-grow works (fabric groups do not resize from child growth alone).
    const replaceNoteGroup = useCallback((c: Canvas, group: Group, meta: NoteMeta, geometry: NoteGeometry): Group => {
        const idx = c.getObjects().indexOf(group as any);
        const wasActive = c.getActiveObject() === group;
        const name = String((group as any).name ?? noteName('note'));
        const opacity = group.opacity ?? 1;
        const angle = group.angle ?? 0;
        const visible = group.visible !== false;
        const locked = (group as any).lockMovementX === true;
        const next = makeNoteGroup(meta, geometry, name);
        next.set({ opacity, angle, visible } as any);
        next.set({
            lockMovementX: locked,
            lockMovementY: locked,
            lockScalingX: locked,
            lockScalingY: locked,
            lockRotation: locked,
        } as any);
        c.remove(group);
        if (idx >= 0) c.insertAt(idx, next);
        else c.add(next);
        next.setCoords();
        c.requestRenderAll();
        if (wasActive) {
            c.setActiveObject(next);
            setSelected(next);
        }
        return next;
    }, []);

    // Apply metadata to a note group: grow it when auto-height is on and the
    // text no longer fits (unless blocked by the page edge or a sibling), else
    // just mirror the composed text into the children and persist the props.
    const applyNoteMeta = useCallback(
        (c: Canvas, group: Group, meta: NoteMeta, rebuild: boolean): Group => {
            const bb = group.getBoundingRect();
            if (rebuild && meta.auto) {
                const geom: NoteGeometry = { leftPx: bb.left, topPx: bb.top, widthPx: bb.width, heightPx: bb.height };
                const need = measureNoteHeightPx(meta, geom);
                if (need > bb.height + 1.5) {
                    const bottomNew = bb.top + need;
                    const fits = bb.left >= 0 && bb.top >= 0 && bb.left + bb.width <= pxW && bottomNew <= pxH;
                    if (fits && !objectsIntersect(c, group, bb.left, bb.top, bb.left + bb.width, bottomNew)) {
                        return replaceNoteGroup(c, group, meta, { ...geom, heightPx: need });
                    }
                }
            }
            const kids = noteChildren(group);
            const mirrorTitle = substituteTokensInText(meta.title);
            const mirrorBody = substituteTokensInText(plainFromHtml(meta.bodyHtml));
            if (kids.title && kids.title.text !== mirrorTitle) kids.title.set({ text: mirrorTitle, tokenText: meta.title } as any);
            if (kids.body && kids.body.text !== mirrorBody) kids.body.set({ text: mirrorBody, tokenText: plainFromHtml(meta.bodyHtml) } as any);
            setNoteMeta(group, meta);
            c.requestRenderAll();
            return group;
        },
        [replaceNoteGroup, pxW, pxH],
    );

    // While the user types directly on the card's title/body textbox on canvas,
    // fold the edited plain text back into the authoritative note metadata.
    const syncEditedNoteText = useCallback((target: FabricObject | undefined): void => {
        if (!target) return;
        const g = noteGroupOf(target);
        if (!g) return;
        const meta = metaFromGroup(g);
        if (!meta) return;
        const kids = noteChildren(g);
        const stash = (target as any).tokenText;
        const txt = (target as IText).text ?? '';
        if (target === kids.title) {
            meta.title = typeof stash === 'string' && txt === substituteTokensInText(stash) ? stash : txt;
            setNoteMeta(g, meta);
        } else if (target === kids.body) {
            const authored = typeof stash === 'string' && txt === substituteTokensInText(stash) ? stash : txt;
            meta.bodyHtml = authored.trim() ? htmlFromPlain(authored) : '<div></div>';
            setNoteMeta(g, meta);
        }
    }, []);

    // Full sync after an inline editing session ends (grow + persist + snapshot).
    const updateNoteFromChildren = useCallback(
        (c: Canvas, group: Group): void => {
            const meta = metaFromGroup(group);
            if (!meta) return;
            applyNoteMeta(c, group, meta, true);
            snapshot(c);
        },
        [applyNoteMeta, snapshot],
    );

    // Insert a freshly centred note card (~58×50mm, clamped to the page).
    const addNoteCard = () => {
        const c = active();
        if (!c) return;
        const w = Math.max(20, Math.min(pxW, Math.round(58 * PX_PER_MM)));
        const h = Math.max(20, Math.min(pxH, Math.round(50 * PX_PER_MM)));
        const meta: NoteMeta = { ...DEFAULT_NOTE_META };
        const g = makeNoteGroup(meta, { leftPx: 0, topPx: 0, widthPx: w, heightPx: h }, noteName('note'));
        placeAtCenter(g);
    };

    const initCanvas = useCallback(
        (el: HTMLCanvasElement, sideKey: Side, initial: unknown, twin: string | null) => {
            const canvas = new Canvas(el, {
                width: pxW,
                height: pxH,
                backgroundColor: '#ffffff',
                preserveObjectStacking: true,
            });
            canvas.on('object:modified', (e: any) => {
                const o = e?.target;
                if (o && noteGroupOf(o) === o) {
                    const meta = metaFromGroup(o);
                    if (meta && meta.auto) applyNoteMeta(canvas, o as Group, meta, true);
                }
                snapshot(canvas, sideKey);
            });
            canvas.on('object:moving', (e: any) => {
                if (e.target) applySnap(canvas, e.target, 'move');
                snapshot(canvas, sideKey);
            });
            canvas.on('object:scaling', (e: any) => {
                if (e.target) applySnap(canvas, e.target, 'scale');
            });
            canvas.on('mouse:up', () => {
                if (snapLinesRef.current.length) {
                    snapLinesRef.current = [];
                    setSnapLines([]);
                }
            });
            canvas.on('selection:created', () => setSelected(canvas.getActiveObject()));
            canvas.on('selection:updated', () => setSelected(canvas.getActiveObject()));
            canvas.on('selection:cleared', () => setSelected(null));
            canvas.on('mouse:down', () => setSelected(canvas.getActiveObject()));
            canvas.on('text:changed', (e: any) => syncEditedNoteText(e?.target));
            canvas.on('text:editing:exited', () => {
                const act = canvas.getActiveObject();
                const g = noteGroupOf(act);
                if (g && act !== g) updateNoteFromChildren(canvas, g as Group);
            });

            const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
                Promise.race([
                    promise,
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('load timeout')), ms)),
                ]);

            const apply = async (json: unknown): Promise<void> => {
                rewriteImageSrcs(json as CanvasJson | null | undefined, standins);
                const isEmpty =
                    !json ||
                    (Array.isArray((json as CanvasJson).objects) && (json as CanvasJson).objects.length === 0);
                if (!isEmpty) {
                    try {
                        await withTimeout(canvas.loadFromJSON(json as any), 12000);
                    } catch {
                        canvas.clear();
                    }
                }
                if (canvas.getObjects().length === 0 && twin) {
                    try {
                        const objects = await withTimeout(objectsFromHtml(twin, pxW, pxH, standins), 12000);
                        for (const obj of objects) canvas.add(obj);
                    } catch {
                        // keep the empty canvas rather than hanging the editor
                    }
                }

                // Show sample values in the editor (like the popup preview) while
                // keeping the original `{{token}}` text stashed for the save step.
                substituteTokensLive(canvas.getObjects());

                // Reconcile content that was authored against a page size very
                // different from the stored card dimensions (e.g. admit cards
                // imported as 11m-tall strips). Keep the stored page size —
                // shrinking/resizing it here would drift away from the stored
                // card dimensions (and the gallery thumbnail), so instead the
                // content is shrunk to fit the declared page. Absurd pages are
                // capped to MAX_PAGE_PX while PRESERVING their aspect ratio.
                const loaded = canvas.getObjects();
                if (loaded.length > 0) {
                    let b = contentBounds(loaded);

                    // Absurd page (multi-metre tall import): cap to a usable
                    // size keeping the stored aspect ratio, re-fitting content.
                    if (pxW > MAX_PAGE_PX || pxH > MAX_PAGE_PX) {
                        const cap = Math.min(MAX_PAGE_PX / pxW, MAX_PAGE_PX / pxH, 1);
                        const nw = Math.round(pxW * cap);
                        const nh = Math.round(pxH * cap);
                        if (cap < 1) {
                            const fit = Math.min(nw / Math.max(b.maxX - b.minX, 1), nh / Math.max(b.maxY - b.minY, 1), 1);
                            if (fit < 1) scaleObjectsToFit(loaded, fit);
                            b = contentBounds(loaded);
                            const dx = (nw - (b.maxX - b.minX)) / 2 - b.minX;
                            const dy = (nh - (b.maxY - b.minY)) / 2 - b.minY;
                            if (dx !== 0 || dy !== 0) {
                                for (const o of loaded) o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
                            }
                        }
                        canvas.setDimensions({ width: nw, height: nh });
                        if (sideKey === 'front' && (Math.abs(nw / PX_PER_MM - cardW) > 0.5 || Math.abs(nh / PX_PER_MM - cardH) > 0.5)) {
                            setCardW(nw / PX_PER_MM);
                            setCardH(nh / PX_PER_MM);
                            setPreset(matchPreset(nw / PX_PER_MM, nh / PX_PER_MM, presets));
                        }
                        canvas.requestRenderAll();
                    } else if (b.maxX > pxW || b.maxY > pxH) {
                        // 2. design larger than the page -> shrink uniformly on
                        // load so nothing overlaps the page edges. Anchored at
                        // the top-left so the layout matches the HTML twin/print.
                        const fit = Math.min(pxW / Math.max(b.maxX, 1), pxH / Math.max(b.maxY, 1), 1);
                        if (fit < 1) {
                            scaleObjectsToFit(loaded, fit);
                            canvas.requestRenderAll();
                        }
                    }
                }
                if (sideKey === 'front') {
                    history.current.front.undo = [];
                    history.current.front.redo = [];
                    history.current.front.undo.push(canvas.toJSON() as CanvasJson);
                }
                setUndoLen(history.current.front.undo.length + history.current.back.undo.length);
                setRedoLen(history.current.front.redo.length + history.current.back.redo.length);
            };

            return apply(initial).then(() => {
                canvas.renderAll();
                return canvas;
            });
        },
        [pxW, pxH, cardW, cardH, snapshot, clearHistory, standins, applySnap, applyNoteMeta, syncEditedNoteText, updateNoteFromChildren],
    );

    useEffect(() => {
        setBusy(true);
        let front: Canvas | null = null;
        let back: Canvas | null = null;

        const src = bootSourceRef.current;
        bootSourceRef.current = null;
        const initialFront = (src?.front as CanvasJson) ?? (src ? null : ((existing?.contentJson as CanvasJson) ?? null));
        const initialBack = (src?.back as CanvasJson) ?? (src ? null : ((existing?.backContentJson as CanvasJson) ?? null));
        const twinFront = src ? src.twinFront : (existing?.content ?? null);
        const twinBack = src ? src.twinBack : (existing?.backContent ?? null);

        const boot = async () => {
            try {
                if (canvasRef.current) front = await initCanvas(canvasRef.current, 'front', initialFront, twinFront);
                if (backCanvasRef.current) back = await initCanvas(backCanvasRef.current, 'back', initialBack, twinBack);
                canvases.current = { front, back };
            } finally {
                setSelected(null);
                resizeLockRef.current = false;
                setLayerVersion((v) => v + 1);
                fitZoom();
                setBusy(false);
            }
        };
        boot();

        const onResize = () => fitZoom();
        window.addEventListener('resize', onResize);

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width: cw, height: ch } = entry.contentRect;
                setStage({ cw, ch });
            }
        });
        if (viewportRef.current) observer.observe(viewportRef.current);

        return () => {
            window.removeEventListener('resize', onResize);
            observer.disconnect();
            front?.dispose();
            back?.dispose();
            canvases.current = { front: null, back: null };
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pxW, pxH, bootToken]);

    // Viewport interactions: pointer-anchored wheel zoom, Space/middle/Hand pan,
    // and keyboard shortcuts. The capture-phase listeners stop the event before
    // fabric picks it up whenever a pan is intended.
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const onDown = (e: PointerEvent) => {
            const wantPan = panMode === 'hand' || spaceRef.current || e.button === 1;
            if (!wantPan) return;
            e.preventDefault();
            e.stopPropagation();
            panDrag.current = { x: e.clientX, y: e.clientY, sx: viewRef.current.x, sy: viewRef.current.y };
        };
        const onMove = (e: PointerEvent) => {
            const p = panDrag.current;
            if (!p) return;
            e.preventDefault();
            e.stopPropagation();
            setView((v) => ({ ...v, x: p.sx + (e.clientX - p.x), y: p.sy + (e.clientY - p.y) }));
        };
        const onUp = (e: PointerEvent) => {
            if (!panDrag.current) return;
            e.preventDefault();
            e.stopPropagation();
            panDrag.current = null;
        };
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            if (e.ctrlKey) {
                anchorZoom(Math.exp(-e.deltaY * 0.006), mx, my);
            } else {
                anchorZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, mx, my);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
            if (typing) return;
            if ((e.ctrlKey || e.metaKey) && e.code === 'Backslash') {
                e.preventDefault();
                setLeftOpen((o) => !o);
                setRightOpen((o) => !o);
            }
            if (!e.ctrlKey && !e.metaKey && e.key === 'g') setShowGuides((v) => !v);
            if (!e.ctrlKey && !e.metaKey && e.shiftKey && e.key === 'R') setShowRulers((v) => !v);
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 's') setSnapEnabled((v) => !v);
            if (!e.ctrlKey && !e.metaKey && e.shiftKey && e.code === 'Digit2') zoomToSelection();
            if (e.code === 'Space' && !spaceRef.current && panMode !== 'hand') {
                spaceRef.current = true;
                setPanMode((p) => (p === 'off' ? 'space' : p));
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                spaceRef.current = false;
                setPanMode((p) => (p === 'space' ? 'off' : p));
            }
        };

        el.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        el.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            el.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointermove', onMove, true);
            window.removeEventListener('pointerup', onUp, true);
            el.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [anchorZoom, panMode, zoomToSelection]);

    // Keep fabric's cursors / hit-testing in sync with the active pan tool.
    useEffect(() => {
        const c = active();
        if (!c) return;
        const armed = panMode !== 'off';
        c.skipTargetFind = armed;
        c.defaultCursor = armed ? 'grab' : 'default';
        (c as any).hoverCursor = armed ? 'grab' : 'move';
    }, [panMode, side]);

    // Guide drag loop: a pointer held on a ruler (idx === null => create) or on
    // an existing guide line (idx => move/remove) tracks the page coordinate
    // until release, then commits into `guides`.
    useEffect(() => {
        if (!dragGuide) return;
        const onMove2 = (e: PointerEvent) => {
            const pos = pageFromClient(dragGuide.axis, e.clientX, e.clientY);
            setDragGuide({ ...dragGuide, pos });
        };
        const onUp2 = () => {
            const d = dragGuideRef.current;
            setGuides((g) => {
                const v = [...g.v];
                const h = [...g.h];
                if (!d) return g;
                const max = (d.axis === 'v' ? pxW : pxH) - 4;
                const inside = d.pos > 4 && d.pos < max;
                if (d.idx === null) {
                    if (inside) (d.axis === 'v' ? v : h).push(d.pos);
                } else if (inside) {
                    if (d.axis === 'v') v[d.idx] = d.pos;
                    else h[d.idx] = d.pos;
                } else if (d.axis === 'v') {
                    v.splice(d.idx, 1);
                } else {
                    h.splice(d.idx, 1);
                }
                return { v, h };
            });
            setDragGuide(null);
        };
        window.addEventListener('pointermove', onMove2);
        window.addEventListener('pointerup', onUp2);
        return () => {
            window.removeEventListener('pointermove', onMove2);
            window.removeEventListener('pointerup', onUp2);
        };
    }, [dragGuide, pageFromClient, pxW, pxH]);

    useEffect(() => {
        // Re-center when card dims change after load.
        if (!busy) fitZoom();
    }, [busy, pxW, pxH, fitZoom]);

    useEffect(() => {
        const onWin = () => setWin({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onWin);
        return () => window.removeEventListener('resize', onWin);
    }, []);

    const undo = () => {
        const c = active();
        const hist = history.current[side];
        if (!c || hist.undo.length < 2) return;
        lockRef.current = true;
        const prev = hist.undo[hist.undo.length - 2];
        hist.redo.push(hist.undo.pop()!);
        c.loadFromJSON(prev as any)
            .then(() => {
                c.renderAll();
                setSelected(null);
            })
            .finally(() => {
                lockRef.current = false;
                setUndoLen(hist.undo.length + history.current[side === 'front' ? 'back' : 'front'].undo.length);
                setRedoLen(hist.redo.length + history.current[side === 'front' ? 'back' : 'front'].redo.length);
            });
    };

    const redo = () => {
        const c = active();
        const hist = history.current[side];
        const next = hist.redo.pop();
        if (!c || !next) return;
        lockRef.current = true;
        const current = c.toJSON() as CanvasJson;
        hist.undo.push(current);
        c.loadFromJSON(next as any)
            .then(() => {
                c.renderAll();
                setSelected(null);
            })
            .finally(() => {
                lockRef.current = false;
                setUndoLen(hist.undo.length + history.current[side === 'front' ? 'back' : 'front'].undo.length);
                setRedoLen(hist.redo.length + history.current[side === 'front' ? 'back' : 'front'].redo.length);
            });
    };

    const placeAtCenter = (obj: FabricObject) => {
        const c = active();
        if (!c) return;
        obj.set({ left: (c.getWidth() - (obj as any).width!) / 2, top: (c.getHeight() - (obj as any).height!) / 2 });
        c.add(obj);
        c.setActiveObject(obj);
        c.requestRenderAll();
        snapshot(c);
        setSelected(obj);
    };

    const addText = () => {
        const obj = new Textbox(t('Double-click to type'), {
            left: 0, top: 0, width: 120, fontSize: 13, fontFamily: 'Arial', fill: '#111827',
            textAlign: 'left', fontWeight: 'normal', fontStyle: 'normal', underline: false,
        });
        placeAtCenter(obj);
    };

    const addVariable = (token: string, tag: string) => {
        const obj = new Textbox(token, {
            left: 0, top: 0, width: 110, fontSize: 12, fontFamily: 'Arial', fill: '#111827',
            textAlign: 'left', name: `placeholder:${tag}`, editable: false, lockEditing: true,
        });
        obj.set('editable', false);
        placeAtCenter(obj);
    };

    const addImagePlaceholder = async (tag: string, standinKey: 'avatar' | 'qr' | 'logo', widthMm: number) => {
        const c = active();
        if (!c) return;
        const w = Math.round(widthMm * PX_PER_MM);
        const h = w;
        try {
            const img = await Image.fromURL(standins[standinKey], { crossOrigin: 'anonymous' } as any, { left: 0, top: 0, name: `token:${tag}` } as any);
            img.set({ left: 0, top: 0, width: w, height: h });
            const clip = new Rect({ left: img.left, top: img.top, width: w, height: h, rx: 6, ry: 6, absolutePositioned: true } as any);
            img.clipPath = clip;
            placeAtCenter(img);
        } catch {
            return;
        }
    };

    const addShape = (def: (typeof SHAPES)[number]) => {
        const opts = def.build();
        const key = def.key;
        let obj: FabricObject;
        if (key === 'rounded-box' || key === 'rect' || key === 'line') {
            obj = new Rect(opts);
        } else if (key === 'triangle') {
            obj = new Triangle(opts);
        } else if (key === 'circle') {
            obj = new Circle(opts);
        } else if (key === 'arrow' || key === 'chevron') {
            obj = new Polygon((opts as any).points, opts as any);
        } else if (def.key === 'pentagon' || def.key === 'hexagon' || def.key === 'star' || def.key === 'burst' || def.key === 'diamond') {
            obj = new Polygon((opts as any).points, opts as any);
        } else {
            obj = new Path((opts as any).d ?? '', opts as any);
        }
        obj.set({ name: `shape:${key}` });
        placeAtCenter(obj);
    };

    const applyFrame = async (frame: string) => {
        const c = active();
        const obj = c?.getActiveObject();
        if (!c || !obj || obj.type.toLowerCase() !== 'image') return;
        const img = obj as Image;
        const w = img.width! * (img.scaleX ?? 1);
        const h = img.height! * (img.scaleY ?? 1);
        const clipLeft = img.left!;
        const clipTop = img.top!;
        let clip: FabricObject;
        if (frame === 'circle') {
            clip = new Circle({ left: clipLeft, top: clipTop, radius: Math.min(w, h) / 2, absolutePositioned: true } as any);
        } else if (frame === 'rounded') {
            clip = new Rect({ left: clipLeft, top: clipTop, width: w, height: h, rx: 10, ry: 10, absolutePositioned: true } as any);
        } else if (frame === 'hexagon') {
            clip = new Polygon({ points: rgPoints(6, Math.min(w, h) / 2, 0), left: clipLeft, top: clipTop, absolutePositioned: true } as any);
        } else {
            clip = new Path(
                'M0 10 Q0 0 10 0 L80 0 Q90 0 90 10 L90 70 Q90 80 80 80 L10 80 Q0 80 0 70 Z',
                { left: clipLeft, top: clipTop, scaleX: w / 90, scaleY: h / 80, absolutePositioned: true } as any,
            );
        }
        img.clipPath = clip;
        c.requestRenderAll();
        snapshot(c);
    };

    const setProp = (changes: Record<string, unknown>) => {
        const c = active();
        if (!c) return;
        const obj = c.getActiveObject();
        if (!obj) return;
        obj.set(changes as any);
        c.requestRenderAll();
        snapshot(c);
        setSelected(obj);
    };

    const deleteSelected = () => {
        const c = active();
        if (!c) return;
        const obj = c.getActiveObject();
        if (!obj) return;
        c.remove(obj);
        c.discardActiveObject();
        c.requestRenderAll();
        snapshot(c);
        setSelected(null);
    };

    const duplicateSelected = () => {
        const c = active();
        if (!c) return;
        const obj = c.getActiveObject();
        if (!obj) return;
        obj.clone().then((dup) => {
            dup.set({ left: (obj.left ?? 0) + 8, top: (obj.top ?? 0) + 8 });
            c.add(dup);
            c.setActiveObject(dup);
            c.requestRenderAll();
            snapshot(c);
            setSelected(dup);
        });
    };

    const moveLayer = (dir: 'up' | 'down') => {
        const c = active();
        if (!c) return;
        const obj = c.getActiveObject();
        if (!obj) return;
        if (dir === 'up') c.bringObjectForward(obj);
        else c.sendObjectBackwards(obj);
        c.requestRenderAll();
        snapshot(c);
    };

    const toggleLock = () => {
        const c = active();
        const obj = c?.getActiveObject();
        if (!c || !obj) return;
        const locked = (obj as any).lockMovementX === true;
        obj.set({ lockMovementX: !locked, lockMovementY: !locked, lockScalingX: !locked, lockScalingY: !locked, lockRotation: !locked });
        c.requestRenderAll();
        snapshot(c);
    };

    const alignSelection = (mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'dist-h' | 'dist-v') => {
        const c = active();
        if (!c) return;
        const objs = c.getActiveObjects();
        if (objs.length < 2) return;

        if (mode === 'dist-h' || mode === 'dist-v') {
            const key = mode === 'dist-h' ? 'left' : 'top';
            const spanKey = mode === 'dist-h' ? 'width' : 'height';
            const sorted = [...objs].sort((a, b) => (a[key] ?? 0) - (b[key] ?? 0));
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const outer = (first as any).getBoundingRect();
            const inner = (last as any).getBoundingRect();
            const start = outer[key === 'left' ? 'left' : 'top'];
            const end = (inner[key === 'left' ? 'left' : 'top'] + inner[key === 'left' ? 'width' : 'height']);
            const gap = (end - start) / (sorted.length - 1);
            sorted.forEach((o, i) => {
                const dim = (o as any).getBoundingRect();
                o.set({ [key]: start + i * gap });
            });
            c.requestRenderAll();
            snapshot(c);
            return;
        }

        const rects = objs.map((o) => (o as any).getBoundingRect());
        const minLeft = Math.min(...rects.map((r) => r.left));
        const minTop = Math.min(...rects.map((r) => r.top));
        const maxRight = Math.max(...rects.map((r) => r.left + r.width));
        const maxBottom = Math.max(...rects.map((r) => r.top + r.height));
        const spanW = maxRight - minLeft;
        const spanH = maxBottom - minTop;

        objs.forEach((o, i) => {
            const r = rects[i];
            const changes: Record<string, number> = {};
            if (mode === 'left') changes.left = minLeft;
            else if (mode === 'hcenter') changes.left = minLeft + (spanW - r.width) / 2;
            else if (mode === 'right') changes.left = minLeft + spanW - r.width;
            else if (mode === 'top') changes.top = minTop;
            else if (mode === 'vcenter') changes.top = minTop + (spanH - r.height) / 2;
            else if (mode === 'bottom') changes.top = minTop + spanH - r.height;
            (o as any).set(changes);
        });
        c.requestRenderAll();
        snapshot(c);
    };

    const selectLayer = (sideKey: Side, obj: FabricObject) => {
        const c = canvases.current[sideKey];
        if (!c) return;
        if (side !== sideKey) setSide(sideKey);
        c.setActiveObject(obj);
        c.requestRenderAll();
        setSelected(obj);
    };

    const toggleLayerVisibility = (sideKey: Side, obj: FabricObject) => {
        const c = canvases.current[sideKey];
        if (!c) return;
        obj.set({ visible: !obj.visible });
        c.requestRenderAll();
        snapshot(c);
    };

    const nudgeLayer = (sideKey: Side, obj: FabricObject, dir: 'up' | 'down') => {
        const c = canvases.current[sideKey];
        if (!c) return;
        if (dir === 'up') c.bringObjectForward(obj);
        else c.sendObjectBackwards(obj);
        c.requestRenderAll();
        snapshot(c);
    };

    const layerObjects = (sideKey: Side): FabricObject[] => {
        const c = canvases.current[sideKey];
        return c ? (c.getObjects() as FabricObject[]).slice().reverse() : [];
    };

    const layerLabel = (o: FabricObject): string => {
        const name = (o as any).name || '';
        const text = (o as any).text || '';
        if (name.startsWith('placeholder:') || name.startsWith('token:')) {
            if (name.startsWith('token:') && o.type !== 'textbox' && o.type !== 'i-text' && o.type !== 'text') {
                return name.replace('token:', '');
            }
            return text.replace(/\{\{|\}\}/g, '').trim().substring(0, 20) || name.replace(/^(placeholder|token):/, '');
        }
        if (name.startsWith('note:')) return 'Note card';
        if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
            const txt = text.trim().substring(0, 18);
            return txt || 'Text';
        }
        const slug = name.replace(/^(shape:|[a-z-]+:)/, '');
        const friendly = friendlyType(o);
        return slug && slug.toLowerCase() !== String(o.type ?? '').toLowerCase() ? slug : friendly;
    };

    const layerIcon = (o: FabricObject): 'text' | 'var' | 'img' | 'shape' => {
        const name = (o as any).name || '';
        const type = String(o.type ?? '').toLowerCase();
        if (name.startsWith('placeholder:')) return 'var';
        if (name.startsWith('token:')) return 'img';
        if (name.startsWith('note:')) return 'shape';
        if (type === 'textbox' || type === 'i-text' || type === 'text') return 'text';
        return 'shape';
    };

    const isImage = String(selected?.type ?? '').toLowerCase() === 'image';

    const buildHtmlTwins = useCallback((useTokens = false): { front: string; back: string } => {
        const render = (c: Canvas | null): string => {
            if (!c) return '';
            const objects = c.getObjects();
            const mm = (px: number) => (px / PX_PER_MM).toFixed(2);
            const tagOf = (n: string): string | null => {
                const m = n.match(/^(?:placeholder|token):([a-z_]+)$/);
                return m ? m[1] : null;
            };
            const els = objects
                .map((o) => {
                    const name = (o as any).name || '';
                    const isText =
                        o.type.toLowerCase() === 'textbox' || o.type.toLowerCase() === 'i-text' || o.type.toLowerCase() === 'text';
                    const tag = tagOf(name);
                    const left = mm(o.left ?? 0);
                    const top = mm(o.top ?? 0);
                    const wPx = (o as any).width;
                    const hPx = (o as any).height;
                    const scaleX = o.scaleX ?? 1;
                    const scaleY = o.scaleY ?? 1;
                    const width = mm((wPx ?? 0) * scaleX);
                    const height = mm((hPx ?? 0) * scaleY);
                    const opacity = o.opacity ?? 1;
                    const angle = o.angle ?? 0;
                    const pos = `position:absolute;left:${left}mm;top:${top}mm;width:${width}mm;height:${height}mm;opacity:${opacity};transform:rotate(${angle}deg);`;
                    const fill = (o as any).fill;
                    const textStyle = typeof fill === 'string' ? `color:${fill};` : '';
                    const shapeStyle = typeof fill === 'string' ? `background:${fill};` : '';
                    if (name.startsWith('note:')) {
                        const grp = o as Group;
                        const meta = metaFromGroup(grp);
                        const kids = noteChildren(grp);
                        if (!meta || !kids.bg) return '';
                        const absRect = (obj: FabricObject) => {
                            const r = obj.getBoundingRect();
                            return { left: mm(r.left), top: mm(r.top), width: mm(r.width), height: mm(r.height) };
                        };
                        const card = absRect(kids.bg);
                        const pos = `position:absolute;left:${card.left}mm;top:${card.top}mm;width:${card.width}mm;height:${card.height}mm;opacity:${o.opacity ?? 1};transform:rotate(${o.angle ?? 0}deg);`;
                        const cardStyle = `${pos}background:${meta.fill};border:${meta.strokeWidthMm}mm solid ${meta.stroke};border-radius:${meta.radiusMm}mm;box-sizing:border-box;`;
                        const titleRaw = meta.title.trim();
                        const titleEl =
                            titleRaw && kids.title
                                ? (() => {
                                      const a = absRect(kids.title);
                                      return `<div data-el="note-title" style="position:absolute;left:${a.left}mm;top:${a.top}mm;width:${a.width}mm;font-size:${meta.titleFontMm}mm;line-height:1.25;font-weight:bold;font-family:${meta.bodyFontFamily};color:${meta.titleColor};overflow:hidden;">${titleRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
                                  })()
                                : '';
                        const bodyRect = kids.body ? absRect(kids.body) : card;
                        const bodyDiv = `<div data-el="note-body" style="position:absolute;left:${bodyRect.left}mm;top:${bodyRect.top}mm;width:${bodyRect.width}mm;height:${bodyRect.height}mm;font-size:${meta.bodyFontMm}mm;font-family:${meta.bodyFontFamily};line-height:1.45;color:${meta.bodyColor};text-align:left;word-wrap:break-word;overflow:hidden;">${meta.bodyHtml || '<div></div>'}</div>`;
                        return `<div data-el="note" data-tag="${String(name).replace(/^note:/, '')}" style="${cardStyle}">${titleEl}${bodyDiv}</div>`.trim();
                    }
                    if (o.type.toLowerCase() === 'image' && tag) {
                        const urls: Record<string, string> = {
                            student_photo_url: '{{student_photo_url}}',
                            school_logo_url: '{{school_logo_url}}',
                            qr_code_url: '{{qr_code_url}}',
                            secure_attendance_qr: '{{secure_attendance_qr}}',
                            principal_signature_url: '{{principal_signature_url}}',
                            class_teacher_signature: '{{class_teacher_signature}}',
                            staff_photo_url: '{{staff_photo_url}}',
                            staff_signature: '{{staff_signature}}',
                            barcode_url: '{{barcode_url}}',
                        };
                        const src = urls[tag] || '{{' + tag + '}}';
                        const rad = ((o as any).clipPath as any)?.rx ? '10' : '0';
                        const frame = (o as any).clipPath?.type === 'circle' ? '50%' : (o as any).clipPath?.type === 'hexagon' ? '4px' : rad + '%';
                        return `<img data-el="img" data-token="${tag}" style="${pos}object-fit:cover;border-radius:${frame};" src="${src}"/>`.trim();
                    }
                    if (isText && tag) {
                        const display = useTokens ? `{{${tag}}}` : ((o as any).text || `{{${tag}}}`);
                        return `<span data-el="var" data-token="${tag}" style="${pos}${textStyle}font-size:${mm((o as any).fontSize ?? 12)}mm;text-align:${(o as any).textAlign || 'left'};line-height:${height}mm;overflow:hidden;">${display}</span>`.trim();
                    }
                    if (isText) {
                        const oT = o as IText;
                        const deco = [];
                        if ((oT.fontWeight || '') === 'bold') deco.push('bold');
                        if ((oT.fontStyle || '') === 'italic') deco.push('italic');
                        if (oT.underline) deco.push('underline');
                        const tText = (o as any).tokenText;
                        const content =
                            useTokens && typeof tText === 'string' && (oT.text || '') === substituteTokensInText(tText)
                                ? tText
                                : (oT.text || '');
                        return `<span data-el="text" style="${pos}${textStyle}font-size:${mm(oT.fontSize ?? 12)}mm;font-family:${oT.fontFamily || 'Arial'};font-weight:${(oT.fontWeight || 'normal')};font-style:${oT.fontStyle || 'normal'};text-decoration:${deco.join(' ') || 'none'};text-align:${oT.textAlign || 'left'};line-height:${height}mm;display:block;">${content}</span>`.trim();
                    }
                    return `<div data-el="shape" style="${pos}${shapeStyle}border-radius:${(o as any).rx ? '8px' : '2px'};border:${((o as any).strokeWidth || 0)}mm solid ${(o as any).stroke || 'transparent'};"></div>`.trim();
                })
                .filter(Boolean);
            const bgColor = (c as unknown as { backgroundColor?: unknown }).backgroundColor;
            const bg = typeof bgColor === 'string' && bgColor ? bgColor : '#ffffff';
            return `<div class="cd-page" style="position:relative;width:${mm(pxW)}mm;height:${mm(pxH)}mm;overflow:hidden;background:${bg.replace(/"/g, '&quot;')}">${els.join('\n')}</div>`;
        };
        return { front: render(canvases.current.front), back: render(canvases.current.back) };
    }, [pxW, pxH, layerVersion]);

    const thumbnailUri = (c: Canvas | null): string | null => {
        try {
            return c ? c.toDataURL({ format: 'png', multiplier: 0.6 } as any) : null;
        } catch {
            return null;
        }
    };

    const handleSave = () => {
        const c = active();
        if (!c) return;
        if (!name.trim()) return;
        setSaving(true);
        const twins = buildHtmlTwins(true);
        const serialized = {
            title: name.trim(),
            category,
            editor_type: 'fabric',
            type: existing?.type ?? 'completion',
            description: existing?.description ?? null,
            content: twins.front,
            content_json: silhouettes(canvases.current.front?.toJSON() as CanvasJson | null),
            back_content: twins.back || null,
            back_content_json: silhouettes(canvases.current.back?.toJSON() as CanvasJson | null),
            thumbnail_data: { dataUrl: thumbnailUri(c) ?? '', width: pxW, height: pxH },
            card_width_mm: cardW,
            card_height_mm: cardH,
        };
        restoreTokensDeep(serialized.content_json);
        restoreTokensDeep(serialized.back_content_json);
        normalizeJsonTypes(serialized.content_json);
        normalizeJsonTypes(serialized.back_content_json);
        const url = existing ? `/canvas-designer/${existing.id}` : '/canvas-designer';
        router.post(url, serialized as any, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    const previewDocs = useMemo(() => {
        if (!previewOpen) return null;
        const twins = buildHtmlTwins();
        return {
            front: twinPreviewDocWithSamples(twins.front, standins),
            back: twins.back ? twinPreviewDocWithSamples(twins.back, standins) : null,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewOpen, layerVersion, side, selected]);

    const pvW = Math.round(cardW * PX_PER_MM);
    const pvH = Math.round(cardH * PX_PER_MM);
    const pvScale = Math.min(Math.max(0.2, (win.w - 96) / pvW), Math.max(0.25, (win.h - 280) / pvH), 1);
    const pvFrameW = Math.round(pvW * pvScale);
    const pvFrameH = Math.round(pvH * pvScale);
    const pvDialogW = Math.min(pvFrameW + 56, win.w - 32);

    const selectedFont = (selected as IText)?.fontFamily ?? 'Arial';
    const selectedSize = (selected as IText)?.fontSize ?? 12;
    const selectedColor = typeof (selected as any)?.fill === 'string' ? (selected as any)?.fill : '#111827';
    const selectedOpacity = selected?.opacity ?? 1;
    const selectedStrokeWidth = (selected as any)?.strokeWidth ?? 0;
    const locked = (selected as any)?.lockMovementX === true;
    const activeCount = canvases.current[side]?.getActiveObjects()?.length ?? (selected ? 1 : 0);

    const noteCtx = noteGroupOf(selected);
    const noteMeta = noteCtx ? metaFromGroup(noteCtx) : null;
    noteMetaRef.current = noteMeta;
    const noteEditorKey = noteCtx ? layerId(noteCtx) : 0;
    const noteOverflows = (() => {
        if (!noteCtx || !noteMeta) return false;
        const bb = noteCtx.getBoundingRect();
        const need = measureNoteHeightPx(noteMeta, { leftPx: bb.left, topPx: bb.top, widthPx: bb.width, heightPx: bb.height });
        return need > bb.height + 1.5;
    })();
    const allTokens = useMemo(() => placeholderGroups.flatMap((g) => g.items), [placeholderGroups]);

    useEffect(() => {
        const el = noteEditorRef.current;
        if (!el || !noteCtx || !noteMeta) return;
        const target = sanitizeNoteHtml(noteMeta.bodyHtml);
        if (el.innerHTML !== target) el.innerHTML = target;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteEditorKey]);

    const onNoteEditorInput = () => {
        const el = noteEditorRef.current;
        const ctx = noteCtx;
        if (!el || !ctx || !noteMetaRef.current) return;
        const meta = { ...noteMetaRef.current, bodyHtml: sanitizeNoteHtml(el.innerHTML) };
        noteMetaRef.current = meta;
        if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
        noteTimerRef.current = setTimeout(() => {
            const c = active();
            if (!c) return;
            const cur = c.getActiveObject();
            const g = (cur && noteGroupOf(cur)) || ctx;
            const final = applyNoteMeta(c, g as Group, meta, true);
            snapshot(c);
            setLayerVersion((v) => v + 1);
            if (final !== g) setSelected(final);
        }, 450);
    };

    const insertNoteToken = (token: string) => {
        const el = noteEditorRef.current;
        if (!el) return;
        el.focus();
        document.execCommand('insertText', false, token);
        onNoteEditorInput();
    };

    const noteExec = (cmd: string) => {
        const el = noteEditorRef.current;
        if (!el) return;
        el.focus();
        document.execCommand(cmd);
        onNoteEditorInput();
    };

    const updateNoteMeta = (patch: Partial<NoteMeta>) => {
        const c = active();
        if (!c || !noteCtx || !noteMeta) return;
        const cur = c.getActiveObject();
        const g = (cur && noteGroupOf(cur)) || noteCtx;
        const meta = { ...noteMeta, ...patch };
        noteMetaRef.current = meta;
        const final = applyNoteMeta(c, g as Group, meta, true);
        snapshot(c);
        setLayerVersion((v) => v + 1);
        if (final !== g) setSelected(final);
    };

    const sideBg = useMemo(() => {
        const c = canvases.current[side];
        const bg = (c as unknown as { backgroundColor?: unknown })?.backgroundColor;
        return typeof bg === 'string' && bg ? bg : '#ffffff';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [side, layerVersion, bootToken]);

    const contentStats = useMemo(() => {
        const objects = canvases.current[side]?.getObjects() ?? [];
        if (!objects.length) return null;
        const b = contentBounds(objects);
        return {
            cwMm: (b.maxX - b.minX) / PX_PER_MM,
            chMm: (b.maxY - b.minY) / PX_PER_MM,
            mLeft: b.minX / PX_PER_MM,
            mTop: b.minY / PX_PER_MM,
            mRight: Math.max(0, (pxW - b.maxX) / PX_PER_MM),
            mBottom: Math.max(0, (pxH - b.maxY) / PX_PER_MM),
            overflows: b.minX < 0 || b.minY < 0 || b.maxX > pxW || b.maxY > pxH,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [side, layerVersion, bootToken, pxW, pxH]);

    const noteIssues = useMemo(() => {
        const c = canvases.current[side];
        if (!c) return [];
        const out: { name: string; needMm: number; hasMm: number }[] = [];
        for (const o of c.getObjects()) {
            if (!String((o as any).name ?? '').startsWith('note:')) continue;
            const meta = metaFromGroup(o);
            if (!meta) continue;
            const bb = o.getBoundingRect();
            const need = measureNoteHeightPx(meta, { leftPx: bb.left, topPx: bb.top, widthPx: bb.width, heightPx: bb.height });
            if (need > bb.height + 1.5) {
                out.push({ name: meta.title || 'Note card', needMm: need / PX_PER_MM, hasMm: bb.height / PX_PER_MM });
            }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [side, layerVersion, bootToken]);

    const toolGroups = useMemo(
        () => [
            { label: 'Basic', items: SHAPES.filter((s) => s.cat === 'Basic') },
            { label: t('Badges & seals'), items: SHAPES.filter((s) => s.cat === 'Badges & seals') },
            { label: 'Fun', items: SHAPES.filter((s) => s.cat === 'Fun') },
            { label: 'Lines', items: SHAPES.filter((s) => s.cat === 'Lines') },
        ],
        [t],
    );

    // Ruler + guide overlays: ticks are laid out in stage space and projected to
    // screen via the CSS transform, so they stay glued to the page while panning
    // and zooming. Guides are stored in page px and pierce the whole viewport.
    const stageLeft = (stage.cw - pxW * view.s) / 2 + view.x;
    const stageTop = (stage.ch - pxH * view.s) / 2 + view.y;
    const rulerH: React.ReactNode[] = [];
    const rulerV: React.ReactNode[] = [];
    if (showRulers) {
        for (let x = 0; x <= pxW; x += 10) {
            const sx = stageLeft + x * view.s;
            if (sx < -8 || sx > stage.cw + 8) continue;
            rulerH.push(
                <div key={'t' + x} className="absolute top-0 border-white/25" style={{ left: sx, height: x % 100 === 0 ? 9 : x % 50 === 0 ? 6 : 3, borderLeftWidth: 1 }} />,
            );
            if (x % 100 === 0)
                rulerH.push(
                    <span key={'l' + x} className="absolute top-0.5 text-[8px] leading-none text-slate-300" style={{ left: sx + 2 }}>
                        {Math.round(x / PX_PER_MM)}
                    </span>,
                );
        }
        for (let y = 0; y <= pxH; y += 10) {
            const sy = stageTop + y * view.s;
            if (sy < -8 || sy > stage.ch + 8) continue;
            rulerV.push(
                <div key={'t' + y} className="absolute left-0 border-white/25" style={{ top: sy, width: y % 100 === 0 ? 9 : y % 50 === 0 ? 6 : 3, borderTopWidth: 1 }} />,
            );
            if (y % 100 === 0)
                rulerV.push(
                    <span key={'l' + y} className="absolute left-0.5 text-[8px] leading-none text-slate-300" style={{ top: sy + 2 }}>
                        {Math.round(y / PX_PER_MM)}
                    </span>,
                );
        }
    }
    const guideElsV = showGuides ? guides.v.map((p, i) => ({ p, i: i as number | null })) : [];
    const guideElsH = showGuides ? guides.h.map((p, i) => ({ p, i: i as number | null })) : [];
    if (dragGuide && dragGuide.axis === 'v') guideElsV.push({ p: dragGuide.pos, i: null });
    if (dragGuide && dragGuide.axis === 'h') guideElsH.push({ p: dragGuide.pos, i: null });

    return (
        <DashboardLayout user={user}>
            <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-slate-100 dark:bg-slate-950">
                <header className="flex flex-col border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                            ‹ {t('Back')}
                        </Button>
                        <span className="hidden select-none rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 lg:inline dark:bg-slate-800 dark:text-slate-400">
                            {t('Designer')}
                        </span>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('Untitled design — name it here')}
                            className="min-w-[180px] flex-1 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium hover:border-slate-200 focus:border-slate-300 dark:hover:border-slate-700 dark:focus:border-slate-600 dark:bg-slate-900"
                        />
                        <div className="ml-auto flex items-center gap-1">
                            <Button variant="outline" onClick={() => { setPvSide('front'); setPreviewOpen(true); }} disabled={busy}>
                                <Eye className="mr-2 h-4 w-4" /> {t('Preview')}
                            </Button>
                            <Button onClick={handleSave} disabled={saving || !name.trim() || busy}>
                                <Save className="mr-2 h-4 w-4" /> {t('Save')}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-1.5 dark:border-slate-800">
                        <Button size="icon" variant="ghost" onClick={undo} disabled={undoLen === 0} title={t('Undo')}>
                            <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={redo} disabled={redoLen === 0} title={t('Redo')}>
                            <Redo2 className="h-4 w-4" />
                        </Button>
                        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        >
                            {categories.map((c) => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                        </select>
                        <select
                            value={preset}
                            onChange={(e) => {
                                const p = e.target.value;
                                setPreset(p);
                                const size = (presets as any)[p];
                                if (size) applyPageSize(Number(size[0]), Number(size[1]));
                            }}
                            title={t('Page size preset')}
                            className="max-w-[210px] rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        >
                            {Object.entries(presets).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v ? `${presetLabel(k)} — ${v[0]}×${v[1]} mm` : t('Custom — set size in Page settings')}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                setRightTab('page');
                                setRightOpen(true);
                            }}
                            data-cd-pagesize
                            title={t('Page settings — size and background')}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            {Number(cardW).toFixed(1)} × {Number(cardH).toFixed(1)} mm
                        </button>
                        <div className="ml-auto flex items-center gap-0.5">
                            <Button size="icon" variant={showRulers ? 'secondary' : 'ghost'} onClick={() => setShowRulers((v) => !v)} title={t('Show rulers (Shift+R)')}>
                                <Ruler className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant={showGuides ? 'secondary' : 'ghost'} onClick={() => setShowGuides((v) => !v)} title={t('Show guides (G)')}>
                                <SquareSplitHorizontal className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant={snapEnabled ? 'secondary' : 'ghost'} onClick={() => setSnapEnabled((v) => !v)} title={t('Snap to guides & objects (S)')}>
                                <Magnet className="h-4 w-4" />
                            </Button>
                            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
                        </div>
                        <div className="text-[11px] text-slate-400">
                            {t('Scroll to zoom · Hold Space or drag middle mouse to pan')}
                        </div>
                    </div>
                </header>

                <div className="relative flex min-h-0 flex-1">
                    {busy ? (
                        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-100/80 text-sm text-slate-500 dark:bg-slate-950/80">
                            {t('Loading designer…')}
                        </div>
                    ) : null}
                    <aside className={`flex shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${leftOpen ? 'w-72' : 'w-12'}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 px-1 py-1 dark:border-slate-800">
                                <div className="flex items-center gap-0.5">
                                    {([
                                        { key: 'text', label: t('Text'), Icon: Type },
                                        { key: 'var', label: t('Variables'), Icon: Asterisk },
                                        { key: 'shapes', label: t('Shapes'), Icon: Square },
                                        { key: 'photos', label: t('Photos'), Icon: ImageIcon },
                                    ] as const).map(({ key, label, Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setLeftTab(key);
                                                setLeftOpen(true);
                                            }}
                                            title={label}
                                            className={`flex h-8 w-8 items-center justify-center rounded-md ${
                                                leftTab === key && leftOpen
                                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setLeftOpen((o) => !o)}
                                    title={t('Toggle panel (Ctrl+\\\\)')}
                                    className="flex h-8 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    {leftOpen ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                                </button>
                            </div>
                            {leftOpen ? (
                            <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="space-y-5 p-3">
                                {leftTab === 'text' && (
                                <>
                                <section>
                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        <Type className="h-3.5 w-3.5" /> {t('Text')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button size="sm" variant="outline" onClick={addText}>
                                            <TextIcon className="mr-1.5 h-3.5 w-3.5" /> {t('Add Text')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={addNoteCard}
                                            data-cd-addnote
                                            title={t('Add an editable note card — rich body text with placeholders that grows to fit the print')}
                                        >
                                            <SquareSplitHorizontal className="mr-1.5 h-3.5 w-3.5" /> {t('Note Card')}
                                        </Button>
                                        {FONTS.slice(0, 4).map((font) => (
                                            <Button
                                                key={font}
                                                size="sm"
                                                variant="ghost"
                                                style={{ fontFamily: font }}
                                                onClick={() => {
                                                    const obj = new Textbox('Hello', { left: 0, top: 0, width: 110, fontSize: 12, fontFamily: font, fill: '#111827', fontStyle: 'normal', underline: false } as any);
                                                    placeAtCenter(obj);
                                                }}
                                            >
                                                {font}
                                            </Button>
                                        ))}
                                    </div>
                                </section>
                                </>)}

                                {leftTab === 'var' && (
                                <>
                                <section>
                                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        {t('Variables')}
                                    </h4>
                                    <input
                                        type="search"
                                        value={varQuery}
                                        onChange={(e) => setVarQuery(e.target.value)}
                                        placeholder={t('Search variables…')}
                                        className="mb-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    />
                                    <div className="space-y-2">
                                        {placeholderGroups.map((group) => {
                                            const items = group.items.filter(
                                                (item) =>
                                                    !varQuery.trim() ||
                                                    item.label.toLowerCase().includes(varQuery.trim().toLowerCase()) ||
                                                    item.tag.toLowerCase().includes(varQuery.trim().toLowerCase()) ||
                                                    item.token.toLowerCase().includes(varQuery.trim().toLowerCase()),
                                            );
                                            if (items.length === 0) return null;
                                            return (
                                                <div key={group.group}>
                                                    <p className="mb-1 text-[11px] font-medium text-slate-500">{group.group}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {items.map((item) => (
                                                            <button
                                                                key={item.tag}
                                                                onClick={() =>
                                                                    item.kind === 'image'
                                                                        ? addImagePlaceholder(item.tag, item.standin ?? 'logo', item.w ?? 15)
                                                                        : addVariable(item.token, item.tag)
                                                                }
                                                                className="group relative rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                                                                title={
                                                                    item.kind === 'table'
                                                                        ? `${item.token} — fills with a full-width HTML table at print time (context: ${item.availability ?? 'always'})`
                                                                        : `${item.token}${item.availability && item.availability !== 'always' ? ` — filled when generating (${item.availability})` : ''}`
                                                                }
                                                            >
                                                                {item.label}
                                                                {item.kind === 'table' ? (
                                                                    <span className="ml-1 rounded-sm bg-violet-100 px-1 text-[9px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                                                        table
                                                                    </span>
                                                                ) : null}
                                                                {item.availability && item.availability !== 'always' ? (
                                                                    <span
                                                                        className={
                                                                            'ml-1 rounded-sm px-1 text-[9px] font-semibold ' +
                                                                            (item.availability === 'exam'
                                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                                                : item.availability === 'result'
                                                                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                                  : item.availability === 'fee'
                                                                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                                                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')
                                                                        }
                                                                    >
                                                                        {item.availability}
                                                                    </span>
                                                                ) : null}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                                </>)}

                                {leftTab === 'shapes' && (
                                <>
                                <section>
                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        <Square className="h-3.5 w-3.5" /> {t('Shapes')}
                                    </h4>
                                    <div className="space-y-2">
                                        {toolGroups.map((group) => (
                                            <div key={group.label}>
                                                <p className="mb-1 text-[11px] font-medium text-slate-500">{group.label}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.items.map((s) => (
                                                        <button
                                                            key={s.key}
                                                            onClick={() => addShape(s)}
                                                            className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                                                        >
                                                            {s.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                </>)}

                                {leftTab === 'photos' && (
                                <>
                                <section>
                                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        {t('Photo frames')}
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {PHOTO_FRAMES.map((frame) => (
                                            <Button key={frame} size="sm" variant="outline" onClick={() => applyFrame(frame)} disabled={!isImage}>
                                                {frame}
                                            </Button>
                                        ))}
                                    </div>
                                </section>
                                </>)}
                            </div>
                            </div>
                            ) : null}
                        </aside>

                        <main ref={viewportRef} data-cd-viewport className="relative min-h-0 flex-1 overflow-hidden bg-[#26292e] dark:bg-slate-950">
                            <div
                                data-cd-stage
                                className="absolute origin-top-left"
                                style={{
                                    width: pxW,
                                    height: pxH,
                                    left: 0,
                                    top: 0,
                                    transform: `translate(${(stage.cw - pxW * view.s) / 2 + view.x}px, ${(stage.ch - pxH * view.s) / 2 + view.y}px) scale(${view.s})`,
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 border border-slate-600 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)]"
                                    style={{ display: side === 'front' ? 'block' : 'none' }}
                                />
                                <canvas
                                    ref={backCanvasRef}
                                    className="absolute inset-0 border border-slate-600 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)]"
                                    style={{ display: side === 'back' ? 'block' : 'none' }}
                                />
                            </div>
                            {showRulers && (
                                <>
                                    <div
                                        className="pointer-events-auto absolute left-5 top-0 right-0 z-30 h-5 overflow-hidden border-b border-white/10 bg-[#2b2f34]"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDragGuide({ axis: 'v', pos: pageFromClient('v', e.clientX, e.clientY), idx: null });
                                        }}
                                    >
                                        {rulerH}
                                    </div>
                                    <div
                                        className="pointer-events-auto absolute left-0 top-5 bottom-0 z-30 w-5 overflow-hidden border-r border-white/10 bg-[#2b2f34]"
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDragGuide({ axis: 'h', pos: pageFromClient('h', e.clientX, e.clientY), idx: null });
                                        }}
                                    >
                                        {rulerV}
                                    </div>
                                    <div className="pointer-events-auto absolute left-0 top-0 z-30 h-5 w-5 bg-[#2b2f34]" />
                                </>
                            )}
                            {guideElsH.length > 0 || guideElsV.length > 0 ? (
                                <>
                                    {guideElsH.map(({ p, i }) => (
                                        <div
                                            key={i === null ? 'dg' : 'h' + i}
                                            className="pointer-events-auto absolute z-20 h-[2px] cursor-ns-resize bg-fuchsia-400/90"
                                            style={{ top: stageTop + p * view.s - 1, left: 0, right: 0 }}
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDragGuide({ axis: 'h', pos: p, idx: i });
                                            }}
                                            onDoubleClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (i !== null) setGuides((g) => ({ v: g.v, h: g.h.filter((_, j) => j !== i) }));
                                            }}
                                        >
                                            <span className="absolute left-1 top-1 translate-y-[-60%] whitespace-nowrap rounded bg-fuchsia-500 px-1 text-[8px] leading-[10px] text-white">
                                                {Math.round(p / PX_PER_MM)}mm
                                            </span>
                                        </div>
                                    ))}
                                    {guideElsV.map(({ p, i }) => (
                                        <div
                                            key={i === null ? 'dv' : 'v' + i}
                                            className="pointer-events-auto absolute z-20 w-[2px] cursor-ew-resize bg-fuchsia-400/90"
                                            style={{ left: stageLeft + p * view.s - 1, top: 0, bottom: 0 }}
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDragGuide({ axis: 'v', pos: p, idx: i });
                                            }}
                                            onDoubleClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (i !== null) setGuides((g) => ({ v: g.v.filter((_, j) => j !== i), h: g.h }));
                                            }}
                                        >
                                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-fuchsia-500 px-1 text-[8px] leading-[10px] text-white">
                                                {Math.round(p / PX_PER_MM)}mm
                                            </span>
                                        </div>
                                    ))}
                                </>
                            ) : null}
                            {snapLines.map((l, i) =>
                                l.axis === 'x' ? (
                                    <div key={i} className="pointer-events-none absolute z-20 w-px bg-red-500" style={{ left: stageLeft + l.pos * view.s, top: 0, bottom: 0 }} />
                                ) : (
                                    <div key={i} className="pointer-events-none absolute z-20 h-px bg-red-500" style={{ top: stageTop + l.pos * view.s, left: 0, right: 0 }} />
                                ),
                            )}
                            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-[#34383d]/95 px-2 py-1.5 shadow-lg backdrop-blur">
                                <span className="pl-1 text-[11px] font-medium text-slate-400">{t('Pages')}</span>
                                <div className="flex overflow-hidden rounded-md border border-white/10">
                                    {(['front', 'back'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setSide(s)}
                                            className={`px-2.5 py-1 text-[11px] font-semibold ${
                                                side === s
                                                    ? 'bg-white text-slate-900'
                                                    : 'bg-transparent text-slate-300 hover:bg-white/10'
                                            }`}
                                        >
                                            {s === 'front' ? t('Front') : t('Back')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-white/10 bg-[#34383d]/95 p-0.5 shadow-lg backdrop-blur">
                                <Button size="icon" variant="ghost" onClick={() => fitZoom()} className="text-slate-300 hover:bg-white/10 hover:text-white" title={t('Fit to screen (Shift+1)')}>
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => zoomToSelection()} data-cd-zoomtosel disabled={!canvases.current[side]?.getActiveObject()} className="text-slate-300 hover:bg-white/10 hover:text-white" title={t('Zoom to selection (Shift+2)')}>
                                    <Scan className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => zoomBy(-1)} disabled={zoomPct <= 10} className="text-slate-300 hover:bg-white/10 hover:text-white" title={t('Zoom out')}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setZoomMenuOpen((o) => !o);
                                            setZoomInput(String(Math.round(view.s * 100)));
                                        }}
                                        title={t('Zoom')}
                                        className="min-w-[46px] rounded-md px-1 py-1 text-center text-xs font-semibold text-slate-200 hover:bg-white/10"
                                    >
                                        {zoomPct}%
                                    </button>
                                    {zoomMenuOpen ? (
                                        <div data-cd-zoompop className="absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 rounded-lg border border-white/10 bg-[#2b2f34] p-2 shadow-xl">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min={Math.round(ZOOM_MIN * 100)}
                                                    max={Math.round(ZOOM_MAX * 100)}
                                                    value={zoomInput}
                                                    onChange={(e) => setZoomInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const z = Math.max(ZOOM_MIN * 100, Math.min(ZOOM_MAX * 100, Number(zoomInput) || 100)) / 100;
                                                            applyZoom(z);
                                                            setZoomMenuOpen(false);
                                                        }
                                                    }}
                                                    className="w-full rounded-md border border-white/10 bg-[#1c1f22] px-2 py-1 text-xs text-slate-200"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-white/10 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
                                                    onClick={() => {
                                                        const z = Math.max(ZOOM_MIN * 100, Math.min(ZOOM_MAX * 100, Number(zoomInput) || 100)) / 100;
                                                        applyZoom(z);
                                                        setZoomMenuOpen(false);
                                                    }}
                                                >
                                                    ✓
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => zoomBy(1)} disabled={zoomPct >= 800} className="text-slate-300 hover:bg-white/10 hover:text-white" title={t('Zoom in')}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <div className="mx-0.5 h-5 w-px bg-white/10" />
                                <Button
                                    size="icon"
                                    variant={panMode === 'hand' ? 'default' : 'ghost'}
                                    onClick={() => setPanMode((p) => (p === 'hand' ? 'off' : 'hand'))}
                                    data-cd-hand
                                    className={panMode === 'hand' ? '' : 'text-slate-300 hover:bg-white/10 hover:text-white'}
                                    title={t('Hand tool (H / hold Space, middle-drag to pan)')}
                                >
                                    <Hand className="h-4 w-4" />
                                </Button>
                            </div>
                        </main>

                        <aside className={`flex shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${rightOpen ? 'w-72' : 'w-12'}`}>
                            <div className="flex items-center justify-between border-b border-slate-100 px-1 py-1 dark:border-slate-800">
                                <div className="flex items-center gap-0.5">
                                    {([
                                        { key: 'props', label: t('Properties'), Icon: SlidersHorizontal },
                                        { key: 'layers', label: t('Layers'), Icon: Layers },
                                        { key: 'page', label: t('Page'), Icon: FileText },
                                    ] as const).map(({ key, label, Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setRightTab(key);
                                                setRightOpen(true);
                                            }}
                                            title={label}
                                            className={`flex h-8 w-8 items-center justify-center rounded-md ${
                                                rightTab === key && rightOpen
                                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setRightOpen((o) => !o)}
                                    title={t('Toggle panel (Ctrl+\\\\)')}
                                    className="flex h-8 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    {rightOpen ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                                </button>
                            </div>
                            {rightOpen ? (
                            <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="space-y-4 p-3">
                                {rightTab === 'props' && (
                                <>
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    <SlidersHorizontal className="h-3.5 w-3.5" /> {t('Properties')}
                                </h4>

                                {!selected ? (
                                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                                        <p>{t('Select an object on the canvas to edit its properties.')}</p>
                                        <button
                                            onClick={() => {
                                                setRightTab('page');
                                                setRightOpen(true);
                                            }}
                                            className="mx-auto mt-2 flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                                        >
                                            <FileText className="h-3.5 w-3.5" /> {t('Open page settings')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/40">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {layerIcon(selected) === 'var' ? (
                                                        <Asterisk className="h-4 w-4 shrink-0 text-violet-500" />
                                                    ) : layerIcon(selected) === 'img' ? (
                                                        <ImageIcon className="h-4 w-4 shrink-0 text-sky-500" />
                                                    ) : layerIcon(selected) === 'text' ? (
                                                        <Type className="h-4 w-4 shrink-0" />
                                                    ) : (
                                                        <Square className="h-4 w-4 shrink-0" />
                                                    )}
                                                    <span className="truncate">{layerLabel(selected)}</span>
                                                </span>
                                                <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                                    {activeCount > 1 ? `${activeCount} ${t('objects')}` : layerLabel(selected) !== friendlyType(selected) ? friendlyType(selected) : null}
                                                </span>
                                            </div>
                                            {activeCount > 1 ? (
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    {t('Shift-click to include or remove objects — use Align below to arrange them.')}
                                                </p>
                                            ) : null}
                                        </div>

                                        {noteCtx && noteMeta ? (
                                            <div data-cd-note-panel className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2 dark:border-indigo-900 dark:bg-indigo-950/30">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">{t('Note card')}</span>
                                                    <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                                                        <input type="checkbox" checked={noteMeta.auto} onChange={(e) => updateNoteMeta({ auto: e.target.checked })} className="h-3.5 w-3.5 accent-indigo-500" />
                                                        {t('Auto height')}
                                                    </label>
                                                </div>
                                                {noteOverflows ? (
                                                    <p className="text-[11px] font-medium text-red-500">
                                                        {t('Body text overflows this card — increase its height or move overlapping objects.')}
                                                    </p>
                                                ) : null}
                                                <label className="block">
                                                    <span className="mb-1 block text-[11px] text-slate-500">{t('Title')}</span>
                                                    <input
                                                        type="text"
                                                        value={noteMeta.title}
                                                        onChange={(e) => updateNoteMeta({ title: e.target.value })}
                                                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                                                    />
                                                </label>
                                                <div>
                                                    <span className="mb-1 block text-[11px] text-slate-500">{t('Body (rich text)')}</span>
                                                    <div data-cd-note-toolbar className="flex flex-wrap gap-1">
                                                        <Button size="icon" variant="outline" className="h-6 w-6" onMouseDown={(e) => e.preventDefault()} onClick={() => noteExec('bold')} title={t('Bold')}>
                                                            <Bold className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" className="h-6 w-6" onMouseDown={(e) => e.preventDefault()} onClick={() => noteExec('italic')} title={t('Italic')}>
                                                            <Italic className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" className="h-6 w-6" onMouseDown={(e) => e.preventDefault()} onClick={() => noteExec('underline')} title={t('Underline')}>
                                                            <Underline className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" className="h-6 w-6" onMouseDown={(e) => e.preventDefault()} onClick={() => noteExec('insertUnorderedList')} title={t('Bullet list')}>
                                                            <List className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div
                                                        ref={(el) => {
                                                            noteEditorRef.current = el;
                                                            // The editor mounts in the Properties tab which can open AFTER a
                                                            // note is selected (e.g. after reload), so a key-change effect alone
                                                            // never sees the mount. Inject once on mount; a per-mount flag keeps
                                                            // live typing/content intact on later re-renders.
                                                            if (el && !el.dataset.noteEditorInjected && noteMetaRef.current) {
                                                                el.innerHTML = sanitizeNoteHtml(noteMetaRef.current.bodyHtml);
                                                                el.dataset.noteEditorInjected = '1';
                                                            }
                                                        }}
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        key={`${side}-${noteEditorKey}`}
                                                        onInput={onNoteEditorInput}
                                                        data-cd-note-body
                                                        className="mt-1 min-h-[96px] rounded-md border border-slate-200 bg-white p-2 text-sm leading-relaxed outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                                        style={{ fontSize: `${noteMeta.bodyFontMm}mm` }}
                                                    />
                                                    <div data-cd-note-tokens className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                                                        {allTokens.slice(0, 60).map((item) => (
                                                            <button
                                                                key={item.tag}
                                                                onClick={() => insertNoteToken(item.token)}
                                                                className="rounded border border-slate-200 px-1 py-0.5 text-[10px] text-violet-600 hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:text-violet-300 dark:hover:bg-violet-950"
                                                                title={`${item.token} — ${item.label}`}
                                                            >
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Card background')}</span>
                                                        <input type="color" value={noteMeta.fill} onChange={(e) => updateNoteMeta({ fill: e.target.value })} className="h-8 w-full cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700" />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Border')}</span>
                                                        <input type="color" value={noteMeta.stroke} onChange={(e) => updateNoteMeta({ stroke: e.target.value })} className="h-8 w-full cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700" />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Radius (mm)')}</span>
                                                        <input type="number" min={0} max={20} step={0.5} value={noteMeta.radiusMm} onChange={(e) => updateNoteMeta({ radiusMm: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Border width (mm)')}</span>
                                                        <input type="number" min={0} max={10} step={0.1} value={noteMeta.strokeWidthMm} onChange={(e) => updateNoteMeta({ strokeWidthMm: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Body size (mm)')}</span>
                                                        <input type="number" min={2} max={20} step={0.5} value={noteMeta.bodyFontMm} onChange={(e) => updateNoteMeta({ bodyFontMm: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Body font')}</span>
                                                        <select value={noteMeta.bodyFontFamily} onChange={(e) => updateNoteMeta({ bodyFontFamily: e.target.value })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950">
                                                            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                                                        </select>
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Body colour')}</span>
                                                        <input type="color" value={noteMeta.bodyColor} onChange={(e) => updateNoteMeta({ bodyColor: e.target.value })} className="h-8 w-full cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700" />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Title colour')}</span>
                                                        <input type="color" value={noteMeta.titleColor} onChange={(e) => updateNoteMeta({ titleColor: e.target.value })} className="h-8 w-full cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700" />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : null}

                                        <label className="block">
                                            <span className="mb-1 block text-[11px] text-slate-500">{t('Position X / Y')}</span>
                                            <div className="flex gap-2">
                                                <input type="number" value={Math.round(selected.left ?? 0)} onChange={(e) => setProp({ left: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                <input type="number" value={Math.round(selected.top ?? 0)} onChange={(e) => setProp({ top: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                            </div>
                                        </label>

                                        {canvases.current[side]?.getActiveObjects()?.length > 1 && (
                                            <div>
                                                <span className="mb-1 block text-[11px] text-slate-500">{t('Align objects')}</span>
                                                <div className="flex flex-wrap gap-1">
                                                    <Button size="icon" variant="outline" title={t('Align left')} onClick={() => alignSelection('left')}>
                                                        <AlignLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Align center (horiz.)')} onClick={() => alignSelection('hcenter')}>
                                                        <AlignCenter className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Align right')} onClick={() => alignSelection('right')}>
                                                        <AlignRight className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Align top')} onClick={() => alignSelection('top')}>
                                                        <AlignStartVertical className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Align middle (vert.)')} onClick={() => alignSelection('vcenter')}>
                                                        <AlignCenterVertical className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Align bottom')} onClick={() => alignSelection('bottom')}>
                                                        <AlignEndVertical className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Distribute horizontally')} onClick={() => alignSelection('dist-h')}>
                                                        <MoveHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="outline" title={t('Distribute vertically')} onClick={() => alignSelection('dist-v')}>
                                                        <MoveVertical className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {isImage && (
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] text-slate-500">{t('Size (w × h)')}</span>
                                                <div className="flex gap-2">
                                                    <input type="number" value={Math.round((selected as any).width ?? 0)} onChange={(e) => setProp({ scaleX: Number(e.target.value) / ((selected as any).width ?? 1), width: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                    <input type="number" value={Math.round((selected as any).height ?? 0)} onChange={(e) => setProp({ scaleY: Number(e.target.value) / ((selected as any).height ?? 1), height: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                </div>
                                            </label>
                                        )}

                                        {!isImage && !noteCtx && (
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] text-slate-500">{t('Font')}</span>
                                                <select value={selectedFont} onChange={(e) => setProp({ fontFamily: e.target.value })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950">
                                                    {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </label>
                                        )}

                                        {!isImage && !noteCtx && (
                                            <>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <label>
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Size')}</span>
                                                        <input type="number" value={selectedSize} min={4} max={300} onChange={(e) => setProp({ fontSize: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                    </label>
                                                    <div className="col-span-2">
                                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Align')}</span>
                                                        <div className="flex gap-1">
                                                            {(['left', 'center', 'right'] as const).map((a) => (
                                                                <Button
                                                                    key={a}
                                                                    size="icon"
                                                                    variant={((selected as IText)?.textAlign ?? 'left') === a ? 'default' : 'outline'}
                                                                    onClick={() => setProp({ textAlign: a })}
                                                                >
                                                                    {a === 'left' ? <AlignLeft className="h-4 w-4" /> : a === 'center' ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-1">
                                                    <Button size="icon" variant={((selected as IText)?.fontWeight) === 'bold' ? 'default' : 'outline'} onClick={() => setProp({ fontWeight: ((selected as IText)?.fontWeight === 'bold' ? 'normal' : 'bold') })}>
                                                        <Bold className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant={((selected as IText)?.fontStyle) === 'italic' ? 'default' : 'outline'} onClick={() => setProp({ fontStyle: ((selected as IText)?.fontStyle === 'italic' ? 'normal' : 'italic') })}>
                                                        <Italic className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant={(selected as IText)?.underline ? 'default' : 'outline'} onClick={() => setProp({ underline: !(selected as IText)?.underline })}>
                                                        <Underline className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}

                                        {!noteCtx && (
                                        <>
                                            <label>
                                                <span className="mb-1 block text-[11px] text-slate-500">{t('Color')}</span>
                                                <div className="mb-2 flex flex-wrap gap-1">
                                                    {SWATCHES.map((c) => (
                                                        <button
                                                            key={c}
                                                            title={c}
                                                            onClick={() => setProp({ fill: c })}
                                                            style={{ background: c }}
                                                            className={`h-6 w-6 rounded-md border ${c === '#f9fafb' ? 'border-slate-300' : 'border-black/10'} transition hover:scale-110`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={selectedColor} onChange={(e) => setProp({ fill: e.target.value })} className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700" />
                                                    <input type="text" value={selectedColor} onChange={(e) => setProp({ fill: e.target.value })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                </div>
                                            </label>

                                            <div className="grid grid-cols-2 gap-2">
                                                <label>
                                                    <span className="mb-1 block text-[11px] text-slate-500">{t('Opacity')}</span>
                                                    <input type="number" min={0} max={100} value={Math.round(selectedOpacity * 100)} onChange={(e) => setProp({ opacity: Number(e.target.value) / 100 })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                </label>
                                                <label>
                                                    <span className="mb-1 block text-[11px] text-slate-500">{t('Stroke')}</span>
                                                    <input type="number" min={0} max={20} value={selectedStrokeWidth} onChange={(e) => setProp({ strokeWidth: Number(e.target.value) })} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                                </label>
                                            </div>

                                            <details>
                                                <summary className="cursor-pointer text-[11px] font-medium text-slate-500">{t('Gradient fill')}</summary>
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    <input type="color" defaultValue="#111827" data-g1 className="h-9 cursor-pointer rounded-md border p-0.5" />
                                                    <input type="color" defaultValue="#4f46e5" data-g2 className="h-9 cursor-pointer rounded-md border p-0.5" />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            const g1 = document.querySelector<HTMLInputElement>('[data-g1]')?.value ?? '#111827';
                                                            const g2 = document.querySelector<HTMLInputElement>('[data-g2]')?.value ?? '#4f46e5';
                                                            setProp({ fill: new Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{ offset: 0, color: g1 }, { offset: 1, color: g2 }] }) } as any);
                                                        }}
                                                    >
                                                        {t('Apply')}
                                                    </Button>
                                                </div>
                                            </details>
                                        </>
                                    )}

                                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                            <Button size="sm" variant="outline" onClick={() => moveLayer('up')}><ArrowUpToLine className="mr-1.5 h-3.5 w-3.5" /> {t('Bring')}</Button>
                                            <Button size="sm" variant="outline" onClick={() => moveLayer('down')}><ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> {t('Send')}</Button>
                                            <Button size="sm" variant="outline" onClick={duplicateSelected}><Copy className="mr-1.5 h-3.5 w-3.5" /> {t('Duplicate')}</Button>
                                            <Button size="sm" variant="outline" onClick={toggleLock}>
                                                {locked ? <Unlock className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
                                                {t('Lock')}
                                            </Button>
                                        </div>
                                        <Button variant="destructive" size="sm" className="w-full" onClick={deleteSelected}>
                                            <Trash2 className="mr-1.5 h-4 w-4" /> {t('Delete')}
                                        </Button>
                                    </>
                                )}
                                </>)}

                                {rightTab === 'page' && (
                                <>
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    <FileText className="h-3.5 w-3.5" /> {t('Page')}
                                </h4>
                                <p className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>{t('Size and background apply to this design.')}</span>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500 dark:bg-slate-800">
                                        {side === 'front' ? t('Front') : t('Back')} · {Math.round(pxW)} × {Math.round(pxH)} px
                                    </span>
                                </p>

                                <section className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('Page size')}</h5>
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] text-slate-500">{t('Preset')}</span>
                                        <select
                                            value={preset}
                                            onChange={(e) => {
                                                const p = e.target.value;
                                                setPreset(p);
                                                const size = (presets as any)[p];
                                                if (size) applyPageSize(Number(size[0]), Number(size[1]));
                                            }}
                                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        >
                                            {Object.entries(presets).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v ? `${presetLabel(k)} — ${v[0]}×${v[1]} mm` : t('Custom')}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] text-slate-500">{t('Width (mm)')}</span>
                                            <input type="number" step="0.1" min={20} max={600} value={pgW} onChange={(e) => setPgW(Number(e.target.value))} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] text-slate-500">{t('Height (mm)')}</span>
                                            <input type="number" step="0.1" min={20} max={600} value={pgH} onChange={(e) => setPgH(Number(e.target.value))} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                        </label>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full"
                                        onClick={() => applyPageSize(pgW, pgH)}
                                        disabled={Math.round(pgW * PX_PER_MM) === pxW && Math.round(pgH * PX_PER_MM) === pxH}
                                    >
                                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t('Apply page size')}
                                    </Button>
                                    <p className="text-[11px] leading-relaxed text-slate-400">
                                        {t('Your whole design is scaled to keep its proportions and re-centred, so nothing overlaps or goes off the page.')}
                                    </p>
                                </section>

                                <section className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                        {t('Background colour')} · {side === 'front' ? t('Front') : t('Back')}
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                        {SWATCHES.map((c) => (
                                            <button
                                                key={c}
                                                title={c}
                                                onClick={() => setPageBg(c)}
                                                style={{ background: c }}
                                                className={`h-6 w-6 rounded-md border ${c === '#f9fafb' ? 'border-slate-300' : 'border-black/10'} transition hover:scale-110 ${sideBg.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={sideBg} onChange={(e) => setPageBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700" />
                                        <input type="text" value={sideBg} onChange={(e) => setPageBg(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                    </div>
                                    <p className="text-[11px] text-slate-400">{t('Saved with the design and shown in preview and when printed.')}</p>
                                </section>

                                <section className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('Content & margins')}</h5>
                                    {contentStats ? (
                                        <dl className="space-y-1 text-[11px] text-slate-500 dark:text-slate-300">
                                            <div className="flex justify-between">
                                                <dt>{t('Content size')}</dt>
                                                <dd>{contentStats.cwMm.toFixed(1)} × {contentStats.chMm.toFixed(1)} mm</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('Right margin')}</dt>
                                                <dd>{contentStats.mRight.toFixed(1)} mm</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt>{t('Bottom margin')}</dt>
                                                <dd>{contentStats.mBottom.toFixed(1)} mm</dd>
                                            </div>
                                            {contentStats.overflows ? (
                                                <p className="text-[11px] font-medium text-red-500">{t('Content is larger than the page — use Fit content.')}</p>
                                            ) : null}
                                        </dl>
                                    ) : (
                                        <p className="text-[11px] text-slate-400">{t('Nothing on this side yet.')}</p>
                                    )}
                                    {noteIssues.length ? (
                                        <div className="space-y-1">
                                            {noteIssues.map((n, i) => (
                                                <p key={i} className="text-[11px] font-medium text-red-500">
                                                    {t('Note card')} “{n.name}”: {t('needs')} {n.needMm.toFixed(1)}mm ({t('card is')} {n.hasMm.toFixed(1)}mm).
                                                </p>
                                            ))}
                                        </div>
                                    ) : null}
                                    <Button size="sm" variant="outline" className="w-full" onClick={fitContentToPage} title={t('Scale the design down to fit inside the page with a 4 mm margin')}>
                                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> {t('Fit content to page')}
                                    </Button>
                                    {canvases.current[side]?.getActiveObjects()?.length > 1 && (
                                        <div>
                                            <span className="mb-1 block text-[11px] text-slate-500">{t('Align objects')}</span>
                                            <div className="flex flex-wrap gap-1">
                                                <Button size="icon" variant="outline" title={t('Align left')} onClick={() => alignSelection('left')}>
                                                    <AlignLeft className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Align center (horiz.)')} onClick={() => alignSelection('hcenter')}>
                                                    <AlignCenter className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Align right')} onClick={() => alignSelection('right')}>
                                                    <AlignRight className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Align top')} onClick={() => alignSelection('top')}>
                                                    <AlignStartVertical className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Align middle (vert.)')} onClick={() => alignSelection('vcenter')}>
                                                    <AlignCenterVertical className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Align bottom')} onClick={() => alignSelection('bottom')}>
                                                    <AlignEndVertical className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Distribute horizontally')} onClick={() => alignSelection('dist-h')}>
                                                    <MoveHorizontal className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" title={t('Distribute vertically')} onClick={() => alignSelection('dist-v')}>
                                                    <MoveVertical className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </section>
                                </>)}

                                {rightTab === 'layers' && (
                                <>
                                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        <Layers className="h-3.5 w-3.5" /> {t('Layers')}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">{t('Click a layer to select it on the canvas.')}</p>
                                    {(['front', 'back'] as const).map((sideKey) => {
                                        const objs = layerObjects(sideKey);
                                        return (
                                            <div key={sideKey}>
                                                <p className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                                                    <span>{sideKey === 'front' ? t('Front') : t('Back')}</span>
                                                    <span className="text-slate-400">{objs.length}</span>
                                                </p>
                                                {objs.length === 0 ? (
                                                    <p className="rounded-md border border-dashed border-slate-200 px-2 py-1.5 text-[11px] text-slate-400 dark:border-slate-700">
                                                        {t('No objects')}
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {objs.map((o) => {
                                                            const kind = layerIcon(o);
                                                            const isActive = selected === o;
                                                            const visible = o.visible !== false;
                                                            return (
                                                                <div
                                                                    key={layerId(o)}
                                                                    className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs ${
                                                                        isActive
                                                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-200'
                                                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                                                    }`}
                                                                >
                                                                    <button
                                                                        onClick={() => selectLayer(sideKey, o)}
                                                                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                                                        title={layerLabel(o)}
                                                                    >
                                                                        {kind === 'text' ? <Type className="h-3.5 w-3.5 shrink-0" /> : kind === 'var' ? <Asterisk className="h-3.5 w-3.5 shrink-0 text-violet-500" /> : kind === 'img' ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-sky-500" /> : <Square className="h-3.5 w-3.5 shrink-0" />}
                                                                        <span className={`truncate ${visible ? '' : 'line-through opacity-50'}`}>{layerLabel(o)}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => toggleLayerVisibility(sideKey, o)}
                                                                        title={visible ? t('Hide') : t('Show')}
                                                                        className={`rounded p-0.5 ${visible ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 hover:text-slate-500'}`}
                                                                    >
                                                                        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                                    </button>
                                                                    <button onClick={() => nudgeLayer(sideKey, o, 'up')} title={t('Bring forward')} className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                                        <ArrowUpToLine className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button onClick={() => nudgeLayer(sideKey, o, 'down')} title={t('Send backward')} className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                                        <ArrowDownToLine className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                    <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <Eye className="h-3.5 w-3.5" /> {t('Tip')}: {t('Photo frames apply to image placeholders selected on the canvas.')}
                                    </p>
                                </div>
                                </>)}
                            </div>
                            </div>
                            ) : null}
                        </aside>
                    </div>
            </div>
            <div className="hidden">
                <div className="attach-palette" hidden />
            </div>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="sm:max-w-none" style={{ width: pvDialogW, maxWidth: 'calc(100vw - 2rem)' }}>
                    <DialogHeader>
                        <DialogTitle>{t('Print preview')}</DialogTitle>
                        <DialogDescription>
                            {t('How this design will look on paper with sample data. Placeholders that exist on the canvas are filled in automatically.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                            {(['front', 'back'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setPvSide(s)}
                                    className={`px-3 py-1 text-xs font-semibold ${
                                        pvSide === s
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300'
                                    }`}
                                >
                                    {s === 'front' ? t('Front') : t('Back')}
                                </button>
                            ))}
                        </div>
                        <div className="flex w-fit max-w-full items-center justify-center overflow-auto rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                            {pvSide === 'back' && previewDocs && !previewDocs.back ? (
                                <p className="text-sm text-slate-400">{t('This design has no back side yet — add objects while the Back side is selected.')}</p>
                            ) : previewDocs ? (
                                <div
                                    className="shrink-0 overflow-hidden rounded-md bg-white shadow"
                                    style={{ zoom: pvScale, width: pvW, height: pvH }}
                                >
                                    <iframe
                                        title="design print preview"
                                        srcDoc={pvSide === 'front' ? previewDocs.front : previewDocs.back ?? previewDocs.front}
                                        sandbox=""
                                        className="block"
                                        style={{ width: pvW, height: pvH, border: 0 }}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">{t('Build a preview…')}</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

/**
 * Strip transient fabric fields (strokeUniform, dirty...) while keeping the
 * canvas loadable. Returns a JSON object used for persistence.
 */
function silhouettes(json: CanvasJson | null): CanvasJson | null {
    if (!json) return null;
    return {
        ...json,
        objects: (json.objects ?? []).map((o) => ({
            ...o,
            dirty: undefined,
            strokeUniform: undefined,
        })),
    };
}

/**
 * Fabric 6 serialises object types with the class name (Image, Rect, Textbox),
 * but the designer and the imported palette rely on the lowercase names. This
 * reconciles every node (including group members and clip paths) back to the
 * lowercase canonical form after a loadFromJSON round trip.
 */
function lowerTypeNode(o: any): void {
    if (!o || typeof o !== 'object') return;
    if (typeof o.type === 'string') o.type = o.type.toLowerCase();
    if (o.clipPath) lowerTypeNode(o.clipPath);
    if (Array.isArray(o.objects)) o.objects.forEach(lowerTypeNode);
}

function normalizeJsonTypes(json: CanvasJson | null | undefined): void {
    if (!json) return;
    lowerTypeNode(json);
    if (Array.isArray(json.objects)) json.objects.forEach(lowerTypeNode);
}

interface Standins {
    avatar: string;
    qr: string;
    logo: string;
}

/**
 * Imported templates reference placeholder images on the original demo deploy
 * (demo.multischoolerp.com, multischoolv2.projectworlds.com), on now-dead
 * hosts (via.placeholder.com, static.wixstatic.com) or a relative
 * /local-cdn-cache/ path that does not exist here. fabric's loadFromJSON
 * rejects the WHOLE canvas when a single image fails, silently degrading the
 * design to the lossy HTML-twin parse (missing objects, broken layout). Map
 * every known placeholder to the bundled standin assets so templates load
 * natively.
 */
function resolveImageSrc(src: unknown, standins: Standins): unknown {
    if (typeof src !== 'string' || src.startsWith('data:')) return src;
    const s = src.toLowerCase();
    if (/placeholder-avatar|#student_photo|#staff_photo|avatar/i.test(s)) return standins.avatar;
    if (/placeholder-qr|#qr_code|#attendance|#barcode|qr/i.test(s)) return standins.qr;
    if (/placeholder-logo|via\.placeholder|#logo|#signature|logo/i.test(s)) return standins.logo;
    if (/^(https?:)?\/\//i.test(src)) return standins.logo;
    return src;
}

function rewriteImageSrcNode(o: any, standins: Standins): void {
    if (!o || typeof o !== 'object') return;
    if (typeof o.src === 'string') o.src = resolveImageSrc(o.src, standins) as string;
    if (Array.isArray(o.objects)) o.objects.forEach((c) => rewriteImageSrcNode(c, standins));
    if (o.clipPath) rewriteImageSrcNode(o.clipPath, standins);
    if (o.backgroundImage) rewriteImageSrcNode(o.backgroundImage, standins);
    if (o.overlayImage) rewriteImageSrcNode(o.overlayImage, standins);
}

function rewriteImageSrcs(json: CanvasJson | null | undefined, standins: Standins): void {
    if (!json) return;
    rewriteImageSrcNode(json, standins);
}

interface TokenTextObject {
    type?: string;
    text?: string;
    tokenText?: string;
    set?: (p: Record<string, unknown>) => void;
    getObjects?: () => TokenTextObject[];
}

/**
 * Show sample values in the canvas so the editor renders exactly like the
 * gallery/popup preview (which substitutes the same SAMPLE_VALUES). The original
 * `{{token}}` string is stashed in `tokenText` and restored on save unless the
 * user edited the text themselves.
 */
function substituteTokensLive(objects: TokenTextObject[]): void {
    const walk = (o: TokenTextObject): void => {
        if (!o || typeof o !== 'object') return;
        const type = String(o.type || '').toLowerCase();
        if (['textbox', 'i-text', 'text'].includes(type)) {
            if (typeof o.text === 'string' && o.text.includes('{{') && typeof o.set === 'function') {
                const subbed = substituteTokensInText(o.text);
                if (subbed !== o.text) {
                    o.set({ tokenText: o.text, text: subbed });
                }
            }
        } else if (type === 'group' && Array.isArray(o.getObjects)) {
            o.getObjects().forEach(walk);
        }
    };
    objects.forEach(walk);
}

/**
 * Persist the designer back to token semantics: replace sample-substituted text
 * with the original `{{token}}` (unless the user edited it), drop the transient
 * tokenText property, then walk nested group children.
 */
function restoreTokensDeep(json: CanvasJson | null | undefined): void {
    if (!json) return;
    const walk = (o: TokenTextObject): void => {
        if (!o || typeof o !== 'object') return;
        if (typeof o.text === 'string' && typeof o.tokenText === 'string' && o.tokenText.includes('{{')) {
            if (o.text === substituteTokensInText(o.tokenText)) o.text = o.tokenText;
            delete o.tokenText;
        }
        if (Array.isArray((o as { objects?: TokenTextObject[] }).objects)) {
            (o as { objects?: TokenTextObject[] }).objects!.forEach(walk);
        }
        if ((o as { clipPath?: TokenTextObject }).clipPath) walk((o as { clipPath?: TokenTextObject }).clipPath);
    };
    if (Array.isArray(json.objects)) json.objects.forEach(walk);
}

function contentBounds(objects: FabricObject[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    for (const obj of objects) {
        if (!obj || typeof obj.getBoundingRect !== 'function') continue;
        const rect = obj.getBoundingRect();
        const l = rect.left;
        const t = rect.top;
        const r = rect.left + rect.width;
        const b = rect.top + rect.height;
        if (l < minX) minX = l;
        if (t < minY) minY = t;
        if (r > maxX) maxX = r;
        if (b > maxY) maxY = b;
    }
    if (minX === Infinity) {
        minX = 0;
        minY = 0;
    }
    return { minX, minY, maxX, maxY };
}

/**
 * Does any *other* top-level object share the box [L,T]-[R,B] (1mm tolerance)?
 * Used to block note-card auto-grow from sliding into a sibling.
 */
function objectsIntersect(c: Canvas, exclude: FabricObject, L: number, T: number, R: number, B: number): boolean {
    const tol = PX_PER_MM;
    for (const o of c.getObjects()) {
        if (o === exclude || o.excludeFromExport) continue;
        const r = o.getBoundingRect();
        if (!r.width || !r.height) continue;
        if (r.left + r.width - tol > L && r.left + tol < R && r.top + r.height - tol > T && r.top + tol < B) return true;
    }
    return false;
}

/**
 * Scale every object about the top-left origin. Uniform, so geometry of all
 * object kinds (rect/text/image/path) transforms via left/top/scale factors.
 */
function scaleObjectsToFit(objects: FabricObject[], k: number): void {
    if (k >= 1) return;
    for (const obj of objects) {
        obj.set({ left: (obj.left ?? 0) * k, top: (obj.top ?? 0) * k, scaleX: obj.scaleX * k, scaleY: obj.scaleY * k });
        if (obj.strokeWidth) obj.set({ strokeWidth: obj.strokeWidth * k });
        obj.setCoords();
    }
}

const MAX_PAGE_PX = 2180;