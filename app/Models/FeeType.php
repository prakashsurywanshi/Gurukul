<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FeeType extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'status',
    ];
}
