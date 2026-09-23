<?php

namespace App\Support;

/**
 * SVG data-URI standins used to visualise image placeholders in live twin
 * previews and the Canvas Designer without hitting the server for real files.
 */
class TwinStandins
{
    /** @return array{avatar: string, qr: string, logo: string} */
    public static function all(): array
    {
        return [
            'avatar' => self::svgDataUri(self::avatarSvg()),
            'qr' => self::svgDataUri(self::qrSvg()),
            'logo' => self::svgDataUri(self::logoSvg()),
        ];
    }

    public static function svgDataUri(string $svg): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    public static function avatarSvg(string $color = '#cbd5e1'): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140"><circle cx="60" cy="42" r="32" fill="'.$color.'"/><path d="M6 136c4-38 26-54 54-54s50 16 54 54z" fill="'.$color.'"/></svg>';
    }

    private static function qrSvg(): string
    {
        $cells = array_fill(0, 121, false);
        foreach ([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54] as $i) {
            $cells[$i] = true;
        }
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">';
        for ($i = 0; $i < 121; $i++) {
            if ($cells[$i]) {
                $x = intdiv($i, 11) * 12;
                $y = ($i % 11) * 12;
                $svg .= '<rect x="'.$x.'" y="'.$y.'" width="12" height="12" fill="#0f172a"/>';
            }
        }
        $svg .= '</svg>';

        return $svg;
    }

    public static function logoSvg(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="#4f46e5"/><text x="60" y="78" font-size="52" font-family="Arial" font-weight="700" fill="#fff" text-anchor="middle">G</text></svg>';
    }
}