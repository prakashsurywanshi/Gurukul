<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LanguageTranslation extends Model
{
    protected $fillable = [
        'organization_id',
        'locale',
        'translation_key',
        'value',
    ];
}