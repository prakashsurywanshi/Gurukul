import { useEffect, useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';

interface DesignElement {
    id: string;
    kind: string;
    content: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    color: string;
    align: string;
}

interface Card {
    student: {
        id: string;
        admission_no: string;
        first_name: string;
        last_name: string;
        class: string;
        section: string;
        roll_number: string;
        email: string;
        phone: string;
    };
    design: {
        preset: string;
        watermark: {
            enabled: boolean;
            text: string;
            opacity: number;
            rotation: number;
            fontSize: number;
            color: string;
        };
        elements: DesignElement[];
    };
}

interface SheetConfig {
    layout: 'certificate' | 'id_grid';
    card: string;
    cardW: number;
    cardH: number;
    paper: string;
    orientation: 'portrait' | 'landscape';
    margin: number;
    gap: number;
    cutMarks: boolean;
    alignCenter: boolean;
    duplexType: 'front_only' | 'long_edge' | 'side_by_side';
}

const MM_TO_PX = 3.7795275591;
const DESIGN_W = 820;
const DESIGN_H = 600;

const PAPER_MM: Record<string, { w: number; h: number }> = {
    a4: { w: 210, h: 297 },
    a3: { w: 297, h: 420 },
    letter: { w: 215.9, h: 279.4 },
    legal: { w: 215.9, h: 355.6 },
};

function scaleDesign(element: DesignElement, scale: number): DesignElement {
    return {
        ...element,
        x: element.x * scale,
        y: element.y * scale,
        width: element.width * scale,
        fontSize: element.fontSize * scale,
    };
}

function CardFace({ card, cardW, cardH, back }: { card: Card; cardW: number; cardH: number; back?: boolean }) {
    const { t } = useLanguage();
    const pxW = cardW * MM_TO_PX;
    const pxH = cardH * MM_TO_PX;

    const scale = Math.min(pxW / DESIGN_W, pxH / DESIGN_H);
    const offsetX = (pxW - DESIGN_W * scale) / 2;
    const offsetY = (pxH - DESIGN_H * scale) / 2;

    const watermark = card.design.watermark;

    return (
        <div
            className="card-face relative overflow-hidden rounded-[2px] border border-slate-300 bg-white"
            style={{ width: `${cardW}mm`, height: `${cardH}mm` }}
        >
            <div
                className="absolute"
                style={{
                    left: `${offsetX}px`,
                    top: `${offsetY}px`,
                    width: `${DESIGN_W * scale}px`,
                    height: `${DESIGN_H * scale}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            >
                {watermark.enabled && watermark.text ? (
                    <div
                        className="pointer-events-none absolute select-none"
                        style={{
                            left: 0,
                            top: 0,
                            width: DESIGN_W,
                            height: DESIGN_H,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: `rotate(${watermark.rotation}deg)`,
                            color: watermark.color,
                            opacity: watermark.opacity,
                            fontSize: watermark.fontSize,
                            fontWeight: 'bold',
                            whiteSpace: 'pre-line',
                            textAlign: 'center',
                            padding: 20,
                            overflow: 'hidden',
                        }}
                    >
                        {watermark.text}
                    </div>
                ) : null}
                {card.design.elements.map((rawElement) => {
                    const element = scaleDesign(rawElement, scale);
                    return (
                        <div
                            key={rawElement.id}
                            className="absolute"
                            style={{
                                left: element.x,
                                top: element.y,
                                width: element.width,
                                fontSize: element.fontSize,
                                fontFamily: element.fontFamily,
                                fontWeight: element.fontWeight,
                                fontStyle: element.fontStyle,
                                textDecoration: element.textDecoration,
                                color: element.color,
                                textAlign: element.align as 'left' | 'center' | 'right',
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                whiteSpace: 'pre-line',
                            }}
                        >
                            {element.content}
                        </div>
                    );
                })}
                {back ? (
                    <div
                        className="absolute"
                        style={{
                            left: 0,
                            top: DESIGN_H - 60,
                            width: DESIGN_W,
                            textAlign: 'center',
                            fontSize: 14,
                            color: '#94a3b8',
                        }}
                    >
                        {t('BACK')}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default function GenerateDocumentPreview({
    schoolName,
    className,
    cards,
    sheet,
}: {
    schoolName: string;
    className: string;
    cards: Card[];
    sheet: SheetConfig;
}) {
    const { t } = useLanguage();
    const geometry = useMemo(() => {
        const paper = PAPER_MM[sheet.paper] ?? PAPER_MM.a4;
        const paperW = sheet.orientation === 'landscape' ? paper.h : paper.w;
        const paperH = sheet.orientation === 'landscape' ? paper.w : paper.h;

        const usableW = paperW - 2 * sheet.margin;
        const usableH = paperH - 2 * sheet.margin;

        const cardW = sheet.cardW;
        const cardH = sheet.cardH;

        const cols = Math.max(1, Math.floor((usableW + sheet.gap) / (cardW + sheet.gap)));
        const rows = Math.max(1, Math.floor((usableH + sheet.gap) / (cardH + sheet.gap)));

        const contentW = cols * cardW + (cols - 1) * sheet.gap;
        const contentH = rows * cardH + (rows - 1) * sheet.gap;

        const startX = sheet.alignCenter ? sheet.margin + (usableW - contentW) / 2 : sheet.margin;
        const startY = sheet.alignCenter ? sheet.margin + (usableH - contentH) / 2 : sheet.margin;

        const cardsPerSheet = cols * rows;

        return { paperW, paperH, cols, rows, startX, startY, cardW, cardH, cardsPerSheet };
    }, [sheet]);

    const { paperW, paperH, cols, rows, startX, startY, cardW, cardH, cardsPerSheet } = geometry;

    const faces = useMemo(() => {
        const front = cards.map((card, index) => ({
            card,
            back: sheet.duplexType !== 'front_only' && index % 2 === 1,
            sheetIndex: Math.floor(index / cardsPerSheet),
            position: index % cardsPerSheet,
        }));

        return front;
    }, [cards, cardsPerSheet, sheet.duplexType]);

    const sheetCount = faces.length > 0 ? faces[faces.length - 1].sheetIndex + 1 : 0;

    useEffect(() => {
        const timer = window.setTimeout(() => {
            window.print();
        }, 250);

        return () => window.clearTimeout(timer);
    }, []);

    const sheetStyle = {
        width: `${paperW}mm`,
        height: `${paperH}mm`,
        paddingTop: `${startY}mm`,
        paddingLeft: `${startX}mm`,
        paddingRight: `${paperW - startX - cols * cardW - (cols - 1) * sheet.gap}mm`,
        paddingBottom: `${paperH - startY - rows * cardH - (rows - 1) * sheet.gap}mm`,
    } as const;

    const renderSheet = (sheetIndex: number) => {
        const sheetFaces = faces.filter((face) => face.sheetIndex === sheetIndex);

        return (
            <div key={sheetIndex} className="sheet print-sheet relative bg-white" style={sheetStyle}>
                <div
                    className="grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${cardW}mm)`,
                        gridTemplateRows: `repeat(${rows}, ${cardH}mm)`,
                        columnGap: `${sheet.gap}mm`,
                        rowGap: `${sheet.gap}mm`,
                        width: 'fit-content',
                    }}
                >
                    {Array.from({ length: rows * cols }).map((_, cellIndex) => {
                        const face = sheetFaces[cellIndex];

                        if (!face) {
                            return <div key={cellIndex} />;
                        }

                        return (
                            <div key={face.card.student.id} style={{ transform: face.back ? 'scaleX(-1)' : undefined }}>
                                <CardFace card={face.card} cardW={cardW} cardH={cardH} back={face.back} />
                            </div>
                        );
                    })}
                </div>
                {sheet.cutMarks ? (
                    <CutMarks rows={rows} cols={cols} cardW={cardW} cardH={cardH} gap={sheet.gap} />
                ) : null}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-200">
            <style>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .sheet {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        page-break-after: always;
                        break-after: page;
                    }
                    @page {
                        size: ${paperW}mm ${paperH}mm;
                        margin: 0;
                    }
                }
                @media screen {
                    .sheet {
                        box-shadow: 0 6px 24px rgba(15, 23, 42, 0.18);
                    }
                }
            `}</style>
            <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-6 py-3 shadow-sm">
                <div>
                    <h1 className="text-lg font-bold text-slate-900">
                        {schoolName} — {className}
                    </h1>
                    <p className="text-xs text-slate-500">
                        {cards.length}
                        {t('cards ·')}
                        {sheetCount}
                        {t('sheet')}
                        {sheetCount === 1 ? '' : 's'} · {sheet.card.toUpperCase()} · {sheet.paper.toUpperCase()} ·{' '}
                        {sheet.orientation}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        <Printer className="h-4 w-4" />
                        {t('Print / Save PDF')}
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                        {t('Close')}
                    </button>
                </div>
            </div>

            <div className="space-y-8 p-6">
                {Array.from({ length: sheetCount }).map((_, sheetIndex) => renderSheet(sheetIndex))}
            </div>
        </div>
    );
}

function CutMarks({
    rows,
    cols,
    cardW,
    cardH,
    gap,
}: {
    rows: number;
    cols: number;
    cardW: number;
    cardH: number;
    gap: number;
}) {
    const marks: Array<{ x: number; y: number }> = [];

    for (let column = 0; column < cols - 1; column += 1) {
        for (let row = 0; row < rows; row += 1) {
            marks.push({ x: (column + 1) * cardW + column * gap + gap / 2, y: row * cardH + row * gap + cardH / 2 });
        }
    }

    for (let row = 0; row < rows - 1; row += 1) {
        for (let column = 0; column < cols; column += 1) {
            marks.push({ x: column * cardW + column * gap + cardW / 2, y: (row + 1) * cardH + row * gap + gap / 2 });
        }
    }

    return (
        <div className="pointer-events-none absolute inset-0">
            {marks.map((mark, index) => (
                <div
                    key={index}
                    className="absolute h-[6mm] w-[0.2mm] bg-slate-500"
                    style={{
                        left: `${mark.x}mm`,
                        top: `${mark.y - 3}mm`,
                        position: 'absolute',
                    }}
                />
            ))}
            {marks.map((mark, index) => (
                <div
                    key={`h-${index}`}
                    className="absolute w-[6mm] h-[0.2mm] bg-slate-500"
                    style={{
                        left: `${mark.x - 3}mm`,
                        top: `${mark.y}mm`,
                        position: 'absolute',
                    }}
                />
            ))}
        </div>
    );
}
