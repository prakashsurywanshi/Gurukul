<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DownloadCenterItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'uploaded_by_user_id',
        'title',
        'content_type',
        'category',
        'audience',
        'share_group',
        'format',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'description',
        'duration',
        'downloads_count',
        'shared_on',
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

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
