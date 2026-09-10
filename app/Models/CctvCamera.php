<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CctvCamera extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'location',
        'stream_url',
        'camera_type',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(CctvAccessLog::class, 'cctv_camera_id')->latest();
    }
}