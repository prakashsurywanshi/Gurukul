<!DOCTYPE html>
<html lang="en">
<head>
@php
    $mm = 3.7795275591;
    $designW = 820;
    $designH = 600;

    $paperMap = [
        'a4' => [210.0, 297.0],
        'a3' => [297.0, 420.0],
        'letter' => [215.9, 279.4],
        'legal' => [215.9, 355.6],
    ];

    $paperDim = $paperMap[$sheet['paper']] ?? $paperMap['a4'];
    [$paperW, $paperH] = $sheet['orientation'] === 'landscape' ? [$paperDim[1], $paperDim[0]] : [$paperDim[0], $paperDim[1]];
@endphp
    <meta charset="UTF-8">
    <title>{{ $schoolName }} — {{ $className }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        @page {
            size: {{ $sheet['orientation'] === 'landscape' ? ($paperDim[1]) : ($paperDim[0]) }}mm {{ $sheet['orientation'] === 'landscape' ? ($paperDim[0]) : ($paperDim[1]) }}mm;
            margin: 0;
        }
        body {
            background: #ffffff;
        }
        .sheet {
            position: relative;
            width: {{ $paperW }}mm;
            height: {{ $paperH }}mm;
            page-break-after: always;
            break-after: page;
        }
        .sheet:last-child {
            page-break-after: auto;
            break-after: auto;
        }
        .card-face {
            position: absolute;
            overflow: hidden;
            background: #ffffff;
            border: 0.5px solid #cbd5e1;
        }
        .design-workspace {
            position: absolute;
            transform-origin: top left;
        }
        .card-element {
            position: absolute;
            overflow: hidden;
            white-space: pre-line;
            line-height: 1.2;
        }
    </style>
</head>
<body>
@php
    $margin = (float) $sheet['margin'];
    $gap = (float) $sheet['gap'];
    $cardW = (float) $sheet['cardW'];
    $cardH = (float) $sheet['cardH'];
    $alignCenter = (bool) $sheet['alignCenter'];
    $duplexType = $sheet['duplexType'] ?? 'front_only';
    $cutMarks = (bool) $sheet['cutMarks'];

    $usableW = $paperW - 2 * $margin;
    $usableH = $paperH - 2 * $margin;

    $cols = max(1, (int) floor(($usableW + $gap) / ($cardW + $gap)));
    $rows = max(1, (int) floor(($usableH + $gap) / ($cardH + $gap)));

    $contentW = $cols * $cardW + ($cols - 1) * $gap;
    $contentH = $rows * $cardH + ($rows - 1) * $gap;

    $startX = $alignCenter ? $margin + ($usableW - $contentW) / 2 : $margin;
    $startY = $alignCenter ? $margin + ($usableH - $contentH) / 2 : $margin;

    $cardsPerSheet = $cols * $rows;

    $faces = [];
    foreach ($cards as $index => $card) {
        $faces[] = [
            'card' => $card,
            'back' => $duplexType !== 'front_only' && $index % 2 === 1,
            'sheetIndex' => (int) floor($index / $cardsPerSheet),
            'position' => $index % $cardsPerSheet,
        ];
    }

    $sheets = [];
    foreach ($faces as $face) {
        $sheets[$face['sheetIndex']][] = $face;
    }
@endphp

@foreach ($sheets as $sheetIndex => $sheetFaces)
    <div class="sheet">
        @foreach ($sheetFaces as $face)
            @php
                $position = $face['position'];
                $column = $position % $cols;
                $row = (int) floor($position / $cols);
                $left = $startX + $column * ($cardW + $gap);
                $top = $startY + $row * ($cardH + $gap);

                $cardFacePxW = $cardW * $mm;
                $cardFacePxH = $cardH * $mm;
                $scale = min($cardFacePxW / $designW, $cardFacePxH / $designH);
                $offsetX = ($cardFacePxW - $designW * $scale) / 2;
                $offsetY = ($cardFacePxH - $designH * $scale) / 2;

                $card = $face['card'];
                $watermark = $card['design']['watermark'] ?? [];
                $elements = $card['design']['elements'] ?? [];
            @endphp
            <div
                class="card-face"
                style="left: {{ $left }}mm; top: {{ $top }}mm; width: {{ $cardW }}mm; height: {{ $cardH }}mm;{{ $face['back'] ? ' transform: scaleX(-1);' : '' }}"
            >
                <div class="design-workspace" style="left: {{ $offsetX }}px; top: {{ $offsetY }}px; width: {{ $designW * $scale }}px; height: {{ $designH * $scale }}px;">
                    @if (!empty($watermark['enabled']) && !empty($watermark['text']))
                        <div
                            style="position: absolute; left: 0; top: 0; width: {{ $designW }}px; height: {{ $designH }}px; display: flex; align-items: center; justify-content: center; transform: rotate({{ $watermark['rotation'] ?? -24 }}deg); color: {{ $watermark['color'] ?? '#2563eb' }}; opacity: {{ $watermark['opacity'] ?? 0.08 }}; font-size: {{ $watermark['fontSize'] ?? 72 }}px; font-weight: bold; text-align: center; white-space: pre-line; padding: 20px; overflow: hidden;"
                        >
                            {{ $watermark['text'] }}
                        </div>
                    @endif
                    @foreach ($elements as $element)
                        @php
                            $elementScale = $scale;
                            $elX = ($element['x'] ?? 0) * $elementScale;
                            $elY = ($element['y'] ?? 0) * $elementScale;
                            $elWidth = ($element['width'] ?? 560) * $elementScale;
                            $elFontSize = ($element['fontSize'] ?? 14) * $elementScale;
                        @endphp
                        <div
                            class="card-element"
                            style="left: {{ $elX }}px; top: {{ $elY }}px; width: {{ $elWidth }}px; font-size: {{ $elFontSize }}px; font-family: {{ $element['fontFamily'] ?? 'sans-serif' }}; font-weight: {{ $element['fontWeight'] ?? 'normal' }}; font-style: {{ $element['fontStyle'] ?? 'normal' }}; text-decoration: {{ $element['textDecoration'] ?? 'none' }}; color: {{ $element['color'] ?? '#111827' }}; text-align: {{ $element['align'] ?? 'center' }};"
                        >
                            {{ $element['content'] ?? '' }}
                        </div>
                    @endforeach
                    @if ($face['back'])
                        <div style="position: absolute; left: 0; top: {{ $designH - 60 }}px; width: {{ $designW }}px; text-align: center; font-size: 14px; color: #94a3b8;">
                            BACK
                        </div>
                    @endif
                </div>
            </div>
        @endforeach

        @if ($cutMarks)
            @php
                $marks = [];
                for ($column = 0; $column < $cols - 1; $column++) {
                    for ($row = 0; $row < $rows; $row++) {
                        $marks[] = ['x' => ($column + 1) * $cardW + $column * $gap + $gap / 2, 'y' => $row * $cardH + $row * $gap + $cardH / 2];
                    }
                }
                for ($row = 0; $row < $rows - 1; $row++) {
                    for ($column = 0; $column < $cols; $column++) {
                        $marks[] = ['x' => $column * $cardW + $column * $gap + $cardW / 2, 'y' => ($row + 1) * $cardH + $row * $gap + $gap / 2];
                    }
                }
            @endphp
            <div style="position: absolute; left: 0; top: 0; width: {{ $paperW }}mm; height: {{ $paperH }}mm; pointer-events: none;">
                @foreach ($marks as $index => $mark)
                    <div style="position: absolute; left: {{ $mark['x'] }}mm; top: {{ $mark['y'] - 3 }}mm; width: 0.2mm; height: 6mm; background: #64748b;"></div>
                    <div style="position: absolute; left: {{ $mark['x'] - 3 }}mm; top: {{ $mark['y'] }}mm; width: 6mm; height: 0.2mm; background: #64748b;"></div>
                @endforeach
            </div>
        @endif
    </div>
@endforeach
</body>
</html>