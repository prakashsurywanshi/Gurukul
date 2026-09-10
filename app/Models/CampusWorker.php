<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampusWorker extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'name',
        'worker_type',
        'department_id',
        'phone',
        'joining_date',
        'shift',
        'remarks',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'joining_date' => 'date',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}