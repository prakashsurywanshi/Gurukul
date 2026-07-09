<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibraryAcquisitionRequest extends Model
{
    protected $fillable = [
        'organization_id',
        'title',
        'requested_by',
        'category',
        'priority',
        'copies',
        'budget',
        'status',
        'note',
    ];

    protected $casts = [
        'copies' => 'integer',
        'budget' => 'float',
    ];
}
