<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KnowledgeBaseFaq extends Model
{
    use HasFactory;

    protected $fillable = [
        'entry_key',
        'question',
        'answer',
        'sort_order',
    ];
}
