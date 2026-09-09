<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FeeDiscount extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'name',
        'discount_type',
        'value',
        'description',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
        ];
    }
}