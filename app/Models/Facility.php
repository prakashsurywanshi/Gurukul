<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Facility extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'name',
        'facility_type',
        'capacity',
        'location',
        'description',
        'status',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'sort_order' => 'integer',
        ];
    }
}