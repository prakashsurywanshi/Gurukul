<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PtmSession extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'title',
        'description',
        'date',
        'start_time',
        'end_time',
        'location',
        'status',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function appointments(): HasMany
    {
        return $this->hasMany(PtmAppointment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}