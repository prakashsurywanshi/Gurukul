<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HostelNotice extends Model
{
    protected $fillable = [
        'organization_id',
        'hostel_id',
        'created_by_user_id',
        'title',
        'message',
        'publish_date',
        'status',
    ];

    protected $casts = [
        'publish_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
