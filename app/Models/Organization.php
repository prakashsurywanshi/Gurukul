<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'website',
        'logo',
        'type',
        'status',
        'subscription_plan',
        'subscription_start_date',
        'subscription_end_date',
        'max_students',
        'max_staff',
        'features',
        'settings',
    ];

    protected $casts = [
        'features' => 'array',
        'settings' => 'array',
        'subscription_start_date' => 'date',
        'subscription_end_date' => 'date',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function selectedSessionName(): ?string
    {
        $configuredSession = data_get($this->settings, 'session');

        if (is_string($configuredSession) && $configuredSession !== '') {
            return $configuredSession;
        }

        return AcademicYear::query()
            ->where('organization_id', $this->id)
            ->where('is_current', true)
            ->value('name');
    }

    public function selectedAcademicYearQuery(): Builder
    {
        $configuredSession = $this->selectedSessionName();

        return AcademicYear::query()
            ->where('organization_id', $this->id)
            ->when(
                $configuredSession,
                fn (Builder $query) => $query->where('name', $configuredSession),
                fn (Builder $query) => $query->where('is_current', true)
            );
    }

    public function selectedAcademicYear(): ?AcademicYear
    {
        return $this->selectedAcademicYearQuery()->first();
    }

    public function subscriptionIsExpired(?Carbon $referenceDate = null): bool
    {
        if (!$this->subscription_end_date) {
            return false;
        }

        $comparisonDate = ($referenceDate ?? now())->copy()->startOfDay();

        return $comparisonDate->gt($this->subscription_end_date->copy()->startOfDay());
    }

    public function hasActiveAccess(?Carbon $referenceDate = null): bool
    {
        return $this->status === 'active' && !$this->subscriptionIsExpired($referenceDate);
    }

    public function daysUntilExpiry(?Carbon $referenceDate = null): ?int
    {
        if (!$this->subscription_end_date) {
            return null;
        }

        $comparisonDate = ($referenceDate ?? now())->copy()->startOfDay();

        return $comparisonDate->diffInDays($this->subscription_end_date->copy()->startOfDay(), false);
    }

    public function expiresWithinDays(int $days, ?Carbon $referenceDate = null): bool
    {
        $daysUntilExpiry = $this->daysUntilExpiry($referenceDate);

        return $daysUntilExpiry !== null
            && $daysUntilExpiry >= 0
            && $daysUntilExpiry <= $days;
    }

    public function accessRestrictionMessage(?Carbon $referenceDate = null): ?string
    {
        if ($this->subscriptionIsExpired($referenceDate)) {
            return sprintf(
                'Your organization subscription expired on %s. Please contact the admin to renew access.',
                $this->subscription_end_date?->format('d M Y')
            );
        }

        if ($this->status !== 'active') {
            return 'Your organization account is currently inactive. Please contact the super admin.';
        }

        return null;
    }

    public function expiryWarningMessage(int $warningWindowDays = 10, ?Carbon $referenceDate = null): ?string
    {
        if (!$this->expiresWithinDays($warningWindowDays, $referenceDate)) {
            return null;
        }

        $daysUntilExpiry = $this->daysUntilExpiry($referenceDate);

        return match ($daysUntilExpiry) {
            0 => sprintf(
                'Your organization subscription expires today (%s). Please renew it now to avoid interruption.',
                $this->subscription_end_date?->format('d M Y')
            ),
            1 => sprintf(
                'Your organization subscription expires tomorrow (%s). Please renew it to keep system access active.',
                $this->subscription_end_date?->format('d M Y')
            ),
            default => sprintf(
                'Your organization subscription will expire in %d days on %s. Please renew it before expiry to avoid logout and login restrictions.',
                $daysUntilExpiry,
                $this->subscription_end_date?->format('d M Y')
            ),
        };
    }
}
