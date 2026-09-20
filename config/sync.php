<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Global Device Sync Keys
    |--------------------------------------------------------------------------
    |
    | These keys authenticate device ingestion API calls (biometric, CCTV,
    | transport GPS). They can alternatively be configured per super admin
    | from the Super Admin > Integration Keys screen. The stored database
    | value takes precedence over these env-driven defaults.
    |
    */

    'keys' => [
        'biometric' => env('BIOMETRIC_SYNC_KEY', ''),
        'cctv' => env('CCTV_SYNC_KEY', ''),
        'transport_gps' => env('TRANSPORT_GPS_KEY', ''),
    ],

];