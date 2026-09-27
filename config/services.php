<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/sso/google/callback'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', '/auth/sso/facebook/callback'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI', '/auth/sso/github/callback'),
    ],

    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID'),
        'sender_id' => env('FIREBASE_SENDER_ID'),
        'api_key' => env('FIREBASE_API_KEY'),
        'credentials' => env('FIREBASE_CREDENTIALS'),
        'credentials_json' => env('FIREBASE_CREDENTIALS_JSON'),
    ],

    'whatsapp_bridge' => [
        'url' => env('WHATSAPP_BRIDGE_URL', 'https://whatsappbridge.qodeigence.com'),
        'country_code' => env('WHATSAPP_COUNTRY_CODE', '91'),
        'send_delay_min_seconds' => env('WHATSAPP_SEND_DELAY_MIN_SECONDS', 3),
        'send_delay_max_seconds' => env('WHATSAPP_SEND_DELAY_MAX_SECONDS', 6),
    ],

    'translation' => [
        'provider' => env('TRANSLATION_PROVIDER', 'google'),
        'timeout' => env('TRANSLATION_TIMEOUT', 8),
    ],

];
