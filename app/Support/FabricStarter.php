<?php

namespace App\Support;

/**
 * Builds a minimal but valid fabric-v6 `content_json` + HTML twin for rows
 * created outside the Canvas Designer (e.g. the legacy certificates UI). This
 * guarantees every template row — however it was created — opens and is
 * editable in the designer instead of landing on a blank canvas.
 */
class FabricStarter
{
    public const W_MM = 210.0;

    public const H_MM = 297.0;

    /**
     * @return array{content: string, content_json: array<string, mixed>}
     */
    public static function certificate(): array
    {
        $w = (int) round(self::W_MM * (96 / 25.4));
        $h = (int) round(self::H_MM * (96 / 25.4));

        $box = static function (string $type, array $extra) use ($w, $h): array {
            return array_merge([
                'version' => '6.9.1',
                'originX' => 'left',
                'originY' => 'top',
                'angle' => 0,
                'opacity' => 1,
                'scaleX' => 1,
                'scaleY' => 1,
                'flipX' => false,
                'flipY' => false,
                'strokeWidth' => 0,
                'stroke' => '',
                'visible' => true,
                'backgroundColor' => '',
            ], [
                'type' => $type,
            ], $extra);
        };

        $text = static function (string $text, array $style, ?string $name = null) use ($box): array {
            return $box('textbox', array_merge($style, [
                'text' => $text,
                'fontSize' => 16,
                'fontFamily' => 'Georgia, serif',
                'fill' => '#111827',
                'fontWeight' => 'normal',
                'fontStyle' => 'normal',
                'underline' => false,
                'textAlign' => 'center',
                'lineHeight' => 1.4,
                'charSpacing' => 0,
                'name' => $name ?? 'text',
            ]));
        };

        $objects = [
            $box('rect', ['left' => 0, 'top' => 0, 'width' => $w, 'height' => $h, 'fill' => '#ffffff', 'name' => 'shape:rect']),
            $box('rect', ['left' => 20, 'top' => 20, 'width' => $w - 40, 'height' => $h - 40, 'fill' => '', 'stroke' => '#4f46e5', 'strokeWidth' => 3, 'rx' => 6, 'ry' => 6, 'name' => 'shape:rect']),
            $box('rect', ['left' => 32, 'top' => 80, 'width' => $w - 64, 'height' => 64, 'fill' => '#4f46e5', 'name' => 'shape:rect']),
            $text('{{school_name}}', ['left' => 70, 'top' => 92, 'width' => $w - 140, 'height' => 40, 'fontSize' => 26, 'fontWeight' => 'bold', 'fill' => '#ffffff'], 'placeholder:school_name'),
            $text('Certificate of Achievement', ['left' => 90, 'top' => 220, 'width' => $w - 180, 'height' => 40, 'fontSize' => 30, 'fontWeight' => 'bold', 'fill' => '#4f46e5']),
            $text('This certificate is proudly presented to', ['left' => 100, 'top' => 320, 'width' => $w - 200, 'height' => 24, 'fontSize' => 17]),
            $text('{{student_name}}', ['left' => 70, 'top' => 372, 'width' => $w - 140, 'height' => 44, 'fontSize' => 34, 'fontWeight' => 'bold', 'underline' => true], 'placeholder:student_name'),
            $text('{{achievement}}', ['left' => 90, 'top' => 452, 'width' => $w - 180, 'height' => 26, 'fontSize' => 18, 'fontStyle' => 'italic'], 'placeholder:achievement'),
            $text('Principal', ['left' => 90, 'top' => 700, 'width' => 180, 'height' => 20, 'fontSize' => 16, 'fontWeight' => 'bold', 'textAlign' => 'center']),
            $text('{{issue_date}}', ['left' => $w - 270, 'top' => 700, 'width' => 180, 'height' => 20, 'fontSize' => 16, 'fontWeight' => 'bold', 'textAlign' => 'center'], 'placeholder:issue_date'),
        ];

        return [
            'content_json' => [
                'version' => '6.9.1',
                'objects' => $objects,
                'background' => '#ffffff',
            ],
            'content' => self::htmlTwin(),
        ];
    }

    private static function htmlTwin(): string
    {
        $mm = static fn (float $px): string => number_format($px / (96 / 25.4), 2);

        return '<div class="cd-page" style="position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;">'
            .'<div data-el="shape" style="position:absolute;left:0mm;top:0mm;width:210mm;height:297mm;opacity:1;transform:rotate(0deg);background:#ffffff;border-radius:2px;border:0mm solid transparent;"></div>'
            .'<div data-el="shape" style="position:absolute;left:5.29mm;top:5.29mm;width:199.42mm;height:286.42mm;opacity:1;transform:rotate(0deg);background:;border-radius:8px;border:0.79mm solid #4f46e5;"></div>'
            .'<div data-el="shape" style="position:absolute;left:8.47mm;top:21.17mm;width:193.04mm;height:16.93mm;opacity:1;transform:rotate(0deg);background:#4f46e5;border-radius:2px;border:0mm solid transparent;"></div>'
            .'<span data-el="var" data-token="school_name" style="position:absolute;left:18.52mm;top:24.34mm;width:172.96mm;height:10.58mm;opacity:1;transform:rotate(0deg);color:#ffffff;font-size:6.88mm;text-align:center;line-height:10.58mm;overflow:hidden;">{{school_name}}</span>'
            .'<span data-el="text" style="position:absolute;left:23.81mm;top:58.2mm;width:162.38mm;height:10.58mm;opacity:1;transform:rotate(0deg);color:#4f46e5;font-size:7.94mm;font-family:Georgia, serif;font-weight:bold;font-style:normal;text-decoration:none;text-align:center;line-height:10.58mm;display:block;">Certificate of Achievement</span>'
            .'<span data-el="text" style="position:absolute;left:26.46mm;top:84.66mm;width:157.08mm;height:6.35mm;opacity:1;transform:rotate(0deg);color:#111827;font-size:4.5mm;font-family:Georgia, serif;font-weight:normal;font-style:normal;text-decoration:none;text-align:center;line-height:6.35mm;display:block;">This certificate is proudly presented to</span>'
            .'<span data-el="var" data-token="student_name" style="position:absolute;left:18.52mm;top:98.41mm;width:172.96mm;height:11.64mm;opacity:1;transform:rotate(0deg);color:#111827;font-size:8.99mm;text-align:center;line-height:11.64mm;overflow:hidden;">{{student_name}}</span>'
            .'<span data-el="var" data-token="achievement" style="position:absolute;left:23.81mm;top:119.58mm;width:162.38mm;height:6.88mm;opacity:1;transform:rotate(0deg);color:#111827;font-size:4.76mm;text-align:center;line-height:6.88mm;overflow:hidden;">{{achievement}}</span>'
            .'<span data-el="text" style="position:absolute;left:23.81mm;top:185.19mm;width:47.62mm;height:5.29mm;opacity:1;transform:rotate(0deg);color:#111827;font-size:4.23mm;font-family:Georgia, serif;font-weight:bold;font-style:normal;text-decoration:none;text-align:center;line-height:5.29mm;display:block;">Principal</span>'
            .'<span data-el="var" data-token="issue_date" style="position:absolute;left:138.62mm;top:185.19mm;width:47.62mm;height:5.29mm;opacity:1;transform:rotate(0deg);color:#111827;font-size:4.23mm;text-align:center;line-height:5.29mm;overflow:hidden;">{{issue_date}}</span>'
            .'</div>';
    }
}