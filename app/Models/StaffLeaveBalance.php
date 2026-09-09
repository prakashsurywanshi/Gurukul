<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffLeaveBalance extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'leave_type',
        'year',
        'entitled_days',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'entitled_days' => 'float',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}