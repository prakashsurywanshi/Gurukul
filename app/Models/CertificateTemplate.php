<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CertificateTemplate extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'title',
        'type',
        'description',
        'template_design',
        'design_settings',
        'status',
    ];

    protected $casts = [
        'design_settings' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function issuedCertificates(): HasMany
    {
        return $this->hasMany(IssuedCertificate::class);
    }
}
