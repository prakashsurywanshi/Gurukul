<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use App\Support\TemplateCatalog;
use Illuminate\Database\Eloquent\Builder;
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
        'category',
        'editor_type',
        'description',
        'template_design',
        'design_settings',
        'content',
        'content_json',
        'back_content',
        'back_content_json',
        'thumbnail_data',
        'card_width_mm',
        'card_height_mm',
        'is_system',
        'status',
    ];

    protected $casts = [
        'design_settings' => 'array',
        'content_json' => 'array',
        'back_content_json' => 'array',
        'thumbnail_data' => 'array',
        'card_width_mm' => 'float',
        'card_height_mm' => 'float',
        'is_system' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function issuedCertificates(): HasMany
    {
        return $this->hasMany(IssuedCertificate::class);
    }

    public function isLibraryTemplate(): bool
    {
        return $this->is_system || $this->organization_id === null;
    }

    /**
     * System-provided (gallery) rows shared across organizations.
     */
    public function scopeLibrary(Builder $query): Builder
    {
        return $query->whereNull('organization_id');
    }

    /**
     * Templates owned by a single organization (library copies + user designs).
     */
    public function scopeOwnedBy(Builder $query, int $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * All templates visible in an organization's gallery: library rows plus the
     * organization's own designs.
     */
    public function scopeVisibleTo(Builder $query, int $organizationId, bool $systemOnly = false): Builder
    {
        if ($systemOnly) {
            return $query->whereNull('organization_id');
        }

        return $query->where(fn (Builder $q) => $q->whereNull('organization_id')->orWhere('organization_id', $organizationId));
    }

    /**
     * The printable HTML plus the token palette accepted by the renderer.
     */
    public static function printableTokens(): array
    {
        return array_keys(TemplateCatalog::tokenDataKeys());
    }
}