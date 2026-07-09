<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostalDispatchEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'reference_no',
        'to_title',
        'address',
        'from_title',
        'dispatch_type',
        'dispatch_date',
        'tracking_no',
        'status',
        'note',
    ];

    protected $casts = [
        'dispatch_date' => 'date',
    ];
}
