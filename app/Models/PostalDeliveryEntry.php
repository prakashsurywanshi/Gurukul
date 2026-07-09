<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostalDeliveryEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'reference_no',
        'from_title',
        'address',
        'delivery_type',
        'received_by',
        'delivery_date',
        'tracking_no',
        'status',
        'note',
    ];

    protected $casts = [
        'delivery_date' => 'date',
    ];
}
