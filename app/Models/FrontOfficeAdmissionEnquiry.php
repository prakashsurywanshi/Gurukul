<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FrontOfficeAdmissionEnquiry extends Model
{
    protected $fillable = [
        'organization_id',
        'full_name',
        'guardian_name',
        'email',
        'phone',
        'class_interested',
        'enquiry_date',
        'source',
        'status',
        'notes',
    ];

    protected $casts = [
        'enquiry_date' => 'date',
    ];
}
