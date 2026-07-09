<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LibraryBook extends Model
{
    protected $fillable = [
        'organization_id',
        'book_number',
        'title',
        'author',
        'category',
        'isbn',
        'rack',
        'rack_number',
        'language',
        'publisher',
        'total_copies',
        'available_copies',
        'issued_count',
        'price',
        'status',
    ];

    protected $casts = [
        'total_copies' => 'integer',
        'available_copies' => 'integer',
        'issued_count' => 'integer',
        'price' => 'float',
    ];

    public function circulations(): HasMany
    {
        return $this->hasMany(LibraryCirculation::class);
    }
}
