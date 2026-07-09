<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DownloadCenterShare extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'download_center_media_id',
        'shared_by_user_id',
        'audience',
        'share_group',
        'shared_on',
        'downloads_count',
        'is_active',
    ];

    protected $casts = [
        'shared_on' => 'date',
        'is_active' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(DownloadCenterMedia::class, 'download_center_media_id');
    }

    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by_user_id');
    }
}
