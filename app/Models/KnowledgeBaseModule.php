<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KnowledgeBaseModule extends Model
{
    use HasFactory;

    protected $fillable = [
        'entry_key',
        'title',
        'summary',
        'content',
        'sort_order',
    ];
}
