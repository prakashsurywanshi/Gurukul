<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'license_number',
        'license_expiry_date',
        'license_categories',
        'joining_date',
        'employment_type',
        'emergency_contact',
        'blood_group',
        'photo_path',
        'verification_status',
        'status',
        'policy_expiry_date',
        'policy_number',
    ];

    protected function casts(): array
    {
        return [
            'license_expiry_date' => 'date',
            'joining_date' => 'date',
            'policy_expiry_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}