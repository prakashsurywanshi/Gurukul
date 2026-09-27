<?php

namespace App\Services;

use ZipArchive;

class XlsxExportService
{
    /**
     * Build a minimal OOXML .xlsx workbook from sheet definitions.
     *
     * Usage (modern): build([['name' => 'Sheet1', 'columns' => [['label' => 'A', 'type' => 'text'], ...], 'rows' => [...]]])
     * Usage (legacy): build(['Col A', 'Col B'], [['1', '2'], ...]) — still supported.
     *
     * Column defs support an optional 'type' of 'text' (always written as a
     * string cell so UDISE codes / Aadhaar numbers keep leading zeros),
     * 'number' or 'auto' (default).
     */
    public function build(array $sheets, ?array $rows = null): string
    {
        if ($rows !== null) {
            $sheets = [[
                'name' => 'Report',
                'columns' => array_map(fn (string $column) => ['label' => $column], $sheets),
                'rows' => $rows,
            ]];
        }

        $sheets = $this->normalizeSheets($sheets);

        $zip = new ZipArchive();
        $path = tempnam(sys_get_temp_dir(), 'qgxlsx');

        if ($path === false || $zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Unable to create XLSX archive.');
        }

        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml(count($sheets)));
        $zip->addFromString('_rels/.rels', $this->relsXml());
        $zip->addFromString('xl/workbook.xml', $this->workbookXml($sheets));
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelsXml(count($sheets)));
        $zip->addFromString('xl/styles.xml', $this->stylesXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->sheetXml($sheets[0]));

        foreach ($sheets as $index => $sheet) {
            if ($index === 0) {
                continue;
            }
            $zip->addFromString('xl/worksheets/sheet'.($index + 1).'.xml', $this->sheetXml($sheet));
        }

        $zip->close();

        $contents = (string) file_get_contents($path);
        @unlink($path);

        return $contents;
    }

    public function download(string $contents, string $filename)
    {
        return response($contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    private function normalizeSheets(array $sheets): array
    {
        $usedNames = [];

        return array_map(function (array $sheet, int $index) use (&$usedNames) {
            $columns = collect($sheet['columns'] ?? [])->map(function ($column) {
                $label = is_array($column) ? (string) ($column['label'] ?? '') : (string) $column;

                return [
                    'label' => $label,
                    'type' => is_array($column) ? ($column['type'] ?? 'auto') : 'auto',
                ];
            })->values()->all();

            $name = $this->cleanSheetName((string) ($sheet['name'] ?? 'Sheet'.($index + 1)));
            $base = $name;
            $suffix = 2;

            while (in_array(strtolower($name), $usedNames, true)) {
                $name = substr($base, 0, 27).' '.$suffix++;
            }

            $usedNames[] = strtolower($name);

            return [
                'name' => $name,
                'columns' => $columns,
                'rows' => array_map(fn (array $row) => (array) $row, $sheet['rows'] ?? []),
            ];
        }, $sheets, array_keys($sheets));
    }

    private function cleanSheetName(string $name): string
    {
        $name = preg_replace('/[\/\\\\\?\*\[\]:]/', ' ', $name);

        return trim(substr((string) $name, 0, 31)) ?: 'Sheet';
    }

    private function sheetXml(array $sheet): string
    {
        $xml = new \SimpleXMLElement(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>'
        );

        $sheetData = $xml->addChild('sheetData');

        $headerRow = $sheetData->addChild('row');
        foreach ($sheet['columns'] as $index => $column) {
            $this->addCell($headerRow, $this->cellRef($index + 1, 1), $column['label'], true, 'text');
        }

        foreach ($sheet['rows'] as $rowIndex => $row) {
            $rowNode = $sheetData->addChild('row');
            foreach ($sheet['columns'] as $cellIndex => $column) {
                $value = $row[$column['label']] ?? ($row[$cellIndex] ?? '');
                $this->addCell($rowNode, $this->cellRef($cellIndex + 1, $rowIndex + 2), $value, false, $column['type']);
            }
        }

        return $xml->asXML();
    }

    private function addCell(\SimpleXMLElement $rowNode, string $ref, mixed $value, bool $bold = false, string $type = 'auto'): void
    {
        $cell = $rowNode->addChild('c');
        $cell->addAttribute('r', $ref);

        if ($bold) {
            $cell->addAttribute('s', '1');
        }

        if ($type === 'text') {
            $cell->addAttribute('t', 'inlineStr');
            $is = $cell->addChild('is');
            $is->addChild('t', (string) $value);

            return;
        }

        if (is_numeric($value)) {
            $cell->addAttribute('t', 'n');
            $cell[0] = (string) $value;

            return;
        }

        $cell->addAttribute('t', 'inlineStr');
        $is = $cell->addChild('is');
        $is->addChild('t', (string) $value);
    }

    private function workbookXml(array $sheets): string
    {
        $sheetNodes = '';

        foreach ($sheets as $index => $sheet) {
            $sheetNodes .= '<sheet name="'.htmlspecialchars($sheet['name'], ENT_XML1).'" sheetId="'.($index + 1).'" r:id="rId'.($index + 1).'"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' .
            ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<sheets>'.$sheetNodes.'</sheets></workbook>';
    }

    private function contentTypesXml(int $sheetCount): string
    {
        $overrides = '';

        for ($index = 1; $index <= max($sheetCount, 1); $index++) {
            $overrides .= '<Override PartName="/xl/worksheets/sheet'.$index.'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/xml"/>' .
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
            $overrides .
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' .
            '</Types>';
    }

    private function relsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
            '</Relationships>';
    }

    private function workbookRelsXml(int $sheetCount): string
    {
        $relationships = '';

        for ($index = 1; $index <= max($sheetCount, 1); $index++) {
            $relationships .= '<Relationship Id="rId'.$index.'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'.$index.'.xml"/>';
        }

        $relationships .= '<Relationship Id="rId'.max($sheetCount + 1, 2).'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            $relationships .
            '</Relationships>';
    }

    private function stylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<fonts count="2">' .
            '<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>' .
            '<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>' .
            '</fonts>' .
            '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' .
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' .
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' .
            '<cellXfs count="2">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' .
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' .
            '</cellXfs>' .
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' .
            '</styleSheet>';
    }

    private function cellRef(int $column, int $row): string
    {
        return $this->columnName($column) . $row;
    }

    private function columnName(int $index): string
    {
        $name = '';

        while ($index > 0) {
            $mod = ($index - 1) % 26;
            $name = chr(65 + $mod) . $name;
            $index = intdiv($index - 1 - $mod, 26);
        }

        return $name;
    }
}