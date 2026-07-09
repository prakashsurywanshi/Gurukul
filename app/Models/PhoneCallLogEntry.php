<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhoneCallLogEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'caller_name',
        'phone',
        'call_type',
        'purpose',
        'call_date',
        'call_time',
        'duration',
        'follow_up_date',
        'note',
    ];

    protected $casts = [
        'call_date' => 'date',
        'follow_up_date' => 'date',
    ];
}
