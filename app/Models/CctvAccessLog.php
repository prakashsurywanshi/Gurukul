<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CctvAccessLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'cctv_camera_id',
        'user_id',
        'action',
        'ip_address',
        'user_agent',
    ];

    public function camera(): BelongsTo
    {
        return $this->belongsTo(CctvCamera::class, 'cctv_camera_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}