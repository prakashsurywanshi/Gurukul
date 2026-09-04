<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuperAdminSetting extends Model
{
    use HasFactory;

    protected $table = 'super_admin_settings';

    protected $fillable = [
        'mailer',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'from_name',
        'from_email',
        'reply_to_email',
        'is_active',
        'queue_worker_status',
    ];

    protected $casts = [
        'smtp_password' => 'encrypted',
        'is_active' => 'boolean',
    ];

    public static function singleton(): self
    {
        $settings = static::query()->orderBy('id')->first();

        if ($settings) {
            return $settings;
        }

        return static::query()->create();
    }
}
