<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VisitorRegisterEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'visitor_name',
        'purpose',
        'person_to_meet',
        'contact',
        'id_proof',
        'entry_date',
        'entry_time',
        'exit_time',
        'note',
    ];

    protected $casts = [
        'entry_date' => 'date',
    ];
}
