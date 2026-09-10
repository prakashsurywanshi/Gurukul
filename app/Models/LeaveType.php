<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'days_per_year',
        'approval_required',
        'cashable',
        'color',
        'applies_to',
        'status',
        'description',
    ];

    protected $casts = [
        'days_per_year' => 'float',
        'approval_required' => 'boolean',
        'cashable' => 'boolean',
    ];
}