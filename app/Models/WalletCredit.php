<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletCredit extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'staff_user_id',
        'wallet_type',
        'credits',
        'transaction_type',
        'description',
        'balance_after',
        'created_by',
    ];

    protected $casts = [
        'credits' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }
}
