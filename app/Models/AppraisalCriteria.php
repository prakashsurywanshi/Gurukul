<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalCriteria extends Model
{
    use HasFactory;

    protected $table = 'appraisal_criteria';

    protected $fillable = [
        'organization_id',
        'title',
        'description',
        'weight',
        'status',
    ];

    protected $casts = [
        'weight' => 'integer',
    ];
}