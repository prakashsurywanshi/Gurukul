<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ebook extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'title',
        'author',
        'isbn',
        'type',
        'category_id',
        'description',
        'file',
        'url',
        'thumbnail',
        'subject_id',
        'uploaded_by',
    ];

    protected $casts = [
        'file' => 'array',
    ];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}