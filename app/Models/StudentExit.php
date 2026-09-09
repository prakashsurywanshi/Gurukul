<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentExit extends Model
{
    use HasFactory;

    public const TYPES = ['exit', 'hold'];

    public const STATUSES = ['pending', 'exited', 'held', 'restored'];

    public const EXIT_REASONS = ['transfer_out', 'withdrawn', 'passed_out', 'struck_off'];

    protected $fillable = [
        'organization_id',
        'student_id',
        'type',
        'status',
        'reason',
        'exit_date',
        'tc_number',
        'tc_issued_date',
        'note',
        'acted_by',
    ];

    protected function casts(): array
    {
        return [
            'exit_date' => 'date',
            'tc_issued_date' => 'date',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acted_by');
    }
}