<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DownloadCenterMedia extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'uploaded_by_user_id',
        'title',
        'media_type',
        'source_kind',
        'category',
        'format',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'youtube_url',
        'description',
        'duration',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(DownloadCenterShare::class, 'download_center_media_id');
    }
}
