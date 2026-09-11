<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarksheetUpload extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'exam_id',
        'title',
        'storage_path',
        'original_name',
        'mime_type',
        'size_bytes',
        'status',
        'uploaded_by_user_id',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function getDownloadUrlAttribute(): string
    {
        return asset('storage/' . $this->storage_path);
    }
}
