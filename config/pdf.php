<?php

return [
    /*
    |--------------------------------------------------------------------------
    | PDF driver
    |--------------------------------------------------------------------------
    |
    | dompdf     - pure-PHP rendering (default, always available)
    | chromium  - headless Chromium/Chrome when a binary is available
    | browser   - respond with a printable HTML page that triggers window.print()
    |
    */
    'driver' => env('PDF_DRIVER', 'dompdf'),

    'paper' => env('PDF_PAPER', 'a4'),

    'orientation' => env('PDF_ORIENTATION', 'portrait'),

    'default_font' => env('PDF_FONT', 'sans-serif'),

    'chromium_binary' => env('PDF_CHROMIUM_BINARY'),

    'timeout' => env('PDF_TIMEOUT', 30),
];