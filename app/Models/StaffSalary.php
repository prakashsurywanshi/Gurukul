<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffSalary extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'staff_user_id',
        'salary_template_id',
        'effective_from',
        'monthly_net',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'monthly_net' => 'decimal:2',
            'effective_from' => 'date',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SalaryTemplate::class);
    }
}