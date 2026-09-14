<?php

namespace App\Services;

use ZipArchive;

class XlsxExportService
{
    /**
     * Build a minimal OOXML .xlsx workbook from column headers and string rows.
     * Values are written as inline strings so no shared-strings table is needed.
     */
    public function build(array $columns, array $rows): string
    {
        $sheetXml = $this->sheetXml($columns, $rows);
        $workbookXml = $this->workbookXml();
        $contentTypes = $this->contentTypesXml();
        $rels = $this->relsXml();
        $worksheetRels = $this->worksheetRelsXml();
        $stylesXml = $this->stylesXml();

        $zip = new ZipArchive();
        $path = tempnam(sys_get_temp_dir(), 'qgxlsx');

        if ($path === false || $zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Unable to create XLSX archive.');
        }

        $zip->addFromString('[Content_Types].xml', $contentTypes);
        $zip->addFromString('_rels/.rels', $rels);
        $zip->addFromString('xl/workbook.xml', $workbookXml);
        $zip->addFromString('xl/_rels/workbook.xml.rels', $worksheetRels);
        $zip->addFromString('xl/styles.xml', $stylesXml);
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

        $zip->close();

        $contents = (string) file_get_contents($path);
        @unlink($path);

        return $contents;
    }

    public function download(string $contents, string $filename)
    {
        return response($contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function sheetXml(array $columns, array $rows): string
    {
        $xml = new \SimpleXMLElement(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>'
        );

        $sheetData = $xml->addChild('sheetData');

        $headerRow = $sheetData->addChild('row');
        foreach ($columns as $index => $column) {
            $this->addCell($headerRow, $this->cellRef($index + 1, 1), (string) $column, true);
        }

        foreach ($rows as $rowIndex => $row) {
            $rowNode = $sheetData->addChild('row');
            foreach ((array) $row as $cellIndex => $cellValue) {
                $this->addCell($rowNode, $this->cellRef($cellIndex + 1, $rowIndex + 2), $cellValue);
            }
        }

        return $xml->asXML();
    }

    private function addCell(\SimpleXMLElement $rowNode, string $ref, mixed $value, bool $bold = false): void
    {
        $cell = $rowNode->addChild('c');
        $cell->addAttribute('r', $ref);

        if ($bold) {
            $cell->addAttribute('s', '1');
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

    private function workbookXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' .
            ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>';
    }

    private function contentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/xml"/>' .
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
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

    private function worksheetRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' .
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