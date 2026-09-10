<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'basic',
        'hra',
        'special_allowance',
        'deductions',
        'gross',
        'net_salary',
        'status',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'basic' => 'decimal:2',
            'hra' => 'decimal:2',
            'special_allowance' => 'decimal:2',
            'deductions' => 'array',
            'gross' => 'decimal:2',
            'net_salary' => 'decimal:2',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(StaffSalary::class);
    }
}