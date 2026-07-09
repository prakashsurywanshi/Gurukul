<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KnowledgeBasePageSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'subtitle',
        'search_placeholder',
        'documentation_title',
        'documentation_subtitle',
        'faq_title',
        'faq_subtitle',
    ];
}
