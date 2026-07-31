<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteSetting extends Model
{
    protected $fillable = ['organization_id', 'key', 'value', 'group'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeForOrganization($query, int $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeByGroup($query, string $group)
    {
        return $query->where('group', $group);
    }

    public static function getMap(int $organizationId): array
    {
        $settings = static::where('organization_id', $organizationId)->get();

        $result = [];
        foreach ($settings as $setting) {
            $result[$setting->key] = $setting->value;
        }

        return $result;
    }

    public static function getGroupedMap(int $organizationId): array
    {
        $settings = static::where('organization_id', $organizationId)->get();

        $grouped = [];
        foreach ($settings as $setting) {
            $grouped[$setting->group][$setting->key] = $setting->value;
        }

        return $grouped;
    }

    public static function saveMany(int $organizationId, array $data, string $group = 'shared'): void
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $value = json_encode($value);
            }

            static::updateOrCreate(
                ['organization_id' => $organizationId, 'key' => $key, 'group' => $group],
                ['value' => $value]
            );
        }
    }

    public static function deleteAll(int $organizationId): void
    {
        static::where('organization_id', $organizationId)->delete();
    }
}
