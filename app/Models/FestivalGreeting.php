<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FestivalGreeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'title',
        'message',
        'festival_date',
        'status',
        'sent_count',
    ];

    protected $casts = [
        'festival_date' => 'date',
        'sent_count' => 'integer',
    ];
}
