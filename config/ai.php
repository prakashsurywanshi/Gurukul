<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Provider Configuration
    |--------------------------------------------------------------------------
    |
    | The AI assistant, analytics, and face-search features resolve their
    | provider from per-organization saved settings first, falling back to
    | these env-driven defaults.
    |
    */

    'mode' => env('AI_MODE', 'openai'),
    'base_url' => env('AI_BASE_URL', ''),
    'model' => env('AI_MODEL', ''),
    'api_key' => env('AI_API_KEY'),
    'default_base_url' => 'https://api.openai.com/v1',
    'default_model' => 'gpt-4o-mini',
];