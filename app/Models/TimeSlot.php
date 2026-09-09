<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'start_time',
        'end_time',
        'slot_type',
        'sort_order',
    ];

    protected $casts = [
        'slot_type' => 'string',
    ];
}