<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeDueSlipLog extends Model
{
    use HasFactory;

    protected $table = 'fee_due_slip_logs';

    protected $fillable = [
        'organization_id',
        'student_id',
        'total_due',
        'slip_date',
        'via',
        'created_by',
    ];

    protected $casts = [
        'total_due' => 'float',
        'slip_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}