<?php

namespace App\Support;

use Illuminate\Support\Str;

class QrToken
{
    public static function generate(string $prefix, int $organizationId, int $recordId): string
    {
        return strtoupper($prefix.'-'.(int) $organizationId.'-'.(int) $recordId.'-'.Str::lower(Str::random(6)));
    }
}