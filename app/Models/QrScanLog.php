<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScanLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'scanned_by',
        'method',
        'status',
        'qr_token',
        'ip_address',
        'user_agent',
        'scan_date',
    ];

    protected function casts(): array
    {
        return [
            'scan_date' => 'date:Y-m-d',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function scanner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }
}